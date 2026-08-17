import PizZip from 'pizzip';

/**
 * Markdown → .docx converter for AI-generated memos (SBA Prescreen tab).
 *
 * Produces a minimal editable Word document with the same hand-rolled OOXML
 * approach as lib/documentGenerator.ts. Supports the Markdown subset the
 * agents are instructed to emit: #–#### headings, bullet / numbered lists,
 * pipe tables, bold/italic/inline code, blockquotes, and horizontal rules.
 * Runs in the browser (returns a Blob) — nothing is sent to the server.
 */

const escapeXml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

interface RunStyle {
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  sizeHalfPoints?: number;
}

function run(text: string, style: RunStyle = {}): string {
  if (!text) return '';
  const props: string[] = [];
  if (style.bold) props.push('<w:b/>');
  if (style.italic) props.push('<w:i/>');
  if (style.code) props.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>');
  if (style.sizeHalfPoints) {
    props.push(`<w:sz w:val="${style.sizeHalfPoints}"/><w:szCs w:val="${style.sizeHalfPoints}"/>`);
  }
  const rPr = props.length ? `<w:rPr>${props.join('')}</w:rPr>` : '';
  return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

// Splits inline Markdown (**bold**, *italic*, `code`) into styled runs.
// Links are flattened to their visible text first.
function inlineRuns(text: string, base: RunStyle = {}): string {
  const cleaned = text.replace(/\[([^\]]*)\]\(([^)]*)\)/g, '$1');
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      result += run(cleaned.slice(lastIndex, match.index), base);
    }
    const token = match[0];
    if (token.startsWith('**') || token.startsWith('__')) {
      result += run(token.slice(2, -2), { ...base, bold: true });
    } else if (token.startsWith('`')) {
      result += run(token.slice(1, -1), { ...base, code: true });
    } else {
      result += run(token.slice(1, -1), { ...base, italic: true });
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < cleaned.length) {
    result += run(cleaned.slice(lastIndex), base);
  }
  return result || run('', base);
}

interface ParaOptions {
  indentTwips?: number;
  spacingAfterTwips?: number;
  bottomBorder?: boolean;
}

function paragraph(runs: string, opts: ParaOptions = {}): string {
  const props: string[] = [];
  if (opts.indentTwips) props.push(`<w:ind w:left="${opts.indentTwips}"/>`);
  if (opts.spacingAfterTwips !== undefined) {
    props.push(`<w:spacing w:after="${opts.spacingAfterTwips}"/>`);
  }
  if (opts.bottomBorder) {
    props.push('<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="999999"/></w:pBdr>');
  }
  const pPr = props.length ? `<w:pPr>${props.join('')}</w:pPr>` : '';
  return `<w:p>${pPr}${runs}</w:p>`;
}

const HEADING_SIZES: Record<number, number> = { 1: 32, 2: 28, 3: 26, 4: 24, 5: 22, 6: 22 };

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-');
}

function tableXml(rows: string[][], headerRowCount: number): string {
  const borders =
    '<w:tblBorders>' +
    ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
      .map((side) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>`)
      .join('') +
    '</w:tblBorders>';
  const trs = rows
    .map((cells, rowIdx) => {
      const tcs = cells
        .map((cell) => {
          const runs = inlineRuns(cell, rowIdx < headerRowCount ? { bold: true } : {});
          return (
            '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>' +
            paragraph(runs, { spacingAfterTwips: 0 }) +
            '</w:tc>'
          );
        })
        .join('');
      return `<w:tr>${tcs}</w:tr>`;
    })
    .join('');
  return (
    '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>' +
    borders +
    '<w:tblCellMar><w:left w:w="108" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar>' +
    '</w:tblPr>' +
    trs +
    '</w:tbl>'
  );
}

function markdownToBodyXml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Fenced code block → monospace paragraphs
    if (/^```/.test(trimmed)) {
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        blocks.push(paragraph(run(lines[i], { code: true }), { spacingAfterTwips: 0 }));
        i++;
      }
      i++; // closing fence
      blocks.push(paragraph(''));
      continue;
    }

    // Table
    if (trimmed.startsWith('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const rows: string[][] = [parseTableRow(trimmed)];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      const width = Math.max(...rows.map((r) => r.length));
      const normalized = rows.map((r) =>
        r.length < width ? [...r, ...Array(width - r.length).fill('')] : r
      );
      blocks.push(tableXml(normalized, 1));
      // Word requires a paragraph between a table and whatever follows.
      blocks.push(paragraph('', { spacingAfterTwips: 0 }));
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(paragraph('', { bottomBorder: true }));
      i++;
      continue;
    }

    // Heading
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length;
      blocks.push(
        paragraph(inlineRuns(heading[2], { bold: true, sizeHalfPoints: HEADING_SIZES[level] }), {
          spacingAfterTwips: 120,
        })
      );
      i++;
      continue;
    }

    // Bullet list item (indent level from leading spaces)
    const bullet = /^(\s*)[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      const depth = Math.floor(bullet[1].length / 2);
      blocks.push(
        paragraph(run('• ', {}) + inlineRuns(bullet[2]), {
          indentTwips: 360 + depth * 360,
          spacingAfterTwips: 40,
        })
      );
      i++;
      continue;
    }

    // Numbered list item (keeps the literal number — no numbering.xml needed)
    const numbered = /^(\s*)(\d+)[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      const depth = Math.floor(numbered[1].length / 2);
      blocks.push(
        paragraph(run(`${numbered[2]}. `, {}) + inlineRuns(numbered[3]), {
          indentTwips: 360 + depth * 360,
          spacingAfterTwips: 40,
        })
      );
      i++;
      continue;
    }

    // Blockquote
    const quote = /^>\s?(.*)$/.exec(trimmed);
    if (quote) {
      blocks.push(paragraph(inlineRuns(quote[1], { italic: true }), { indentTwips: 360 }));
      i++;
      continue;
    }

    // Plain paragraph
    blocks.push(paragraph(inlineRuns(trimmed)));
    i++;
  }

  return blocks.join('\n    ');
}

export function markdownToDocxBlob(markdown: string): Blob {
  const zip = new PizZip();

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.folder('_rels');
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.folder('word');
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${markdownToBodyXml(markdown)}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:space="720"/>
    </w:sectPr>
  </w:body>
</w:document>`);

  return zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
