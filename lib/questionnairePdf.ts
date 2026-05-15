import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';

export interface QuestionnaireRule {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  blockType: 'question' | 'ai-generated';
  questionText?: string;
  aiBlockTemplateId?: string;
  mainCategory: 'Business Overview' | 'Project Purpose' | 'Industry';
  purposeKey?: string;
  purposeKeys?: string[];
  naicsCodes?: string[];
  questionOrder?: number;
}

export interface QuestionnaireResponse {
  id?: string;
  projectId: string;
  ruleId: string;
  content: string;
  generatedInputData?: Record<string, any>;
  updatedAt?: Date;
}

export function evaluateRule(
  rule: QuestionnaireRule,
  selectedPurposes: string[],
  naicsCode: string,
  businessStage: string
): boolean {
  if (!rule.enabled) return false;

  if (rule.mainCategory === 'Business Overview') {
    return true;
  }

  if (rule.mainCategory === 'Project Purpose') {
    if (!rule.purposeKey) return true;

    // Map business stage to purpose keys
    if (rule.purposeKey === 'Start Up' && businessStage === 'startup') return true;
    if (rule.purposeKey === 'Existing Business' && (businessStage === 'existing' || businessStage === 'acquiring')) return true;

    // Check if the purposeKey matches any selected use-of-proceeds
    return selectedPurposes.includes(rule.purposeKey);
  }

  if (rule.mainCategory === 'Industry') {
    if (!rule.naicsCodes || rule.naicsCodes.length === 0) return true;
    if (!naicsCode) return false;
    return rule.naicsCodes.some(prefix => naicsCode.startsWith(prefix));
  }

  return true;
}

function normalizePurpose(value: unknown): string {
  // Strip *all* whitespace so legacy spellings like "Start up" still match the
  // canonical "Startup" option emitted by the Project Purpose dropdown.
  return String(value ?? '').replace(/\s+/g, '').toLowerCase();
}

function purposeMatches(key: string, purposes: string[]): boolean {
  const k = normalizePurpose(key);
  if (!k) return false;
  return purposes.some((p) => normalizePurpose(p) === k);
}

/**
 * Project-aware filter mirroring the Edit Questionnaire tab. Returns true if a
 * rule should be included in this project's questionnaire — i.e. the rule is
 * enabled, is a question (not an AI block), is not in the per-project hidden
 * list, and matches the project's purposes / NAICS code.
 */
export function filterRuleByProject(
  rule: QuestionnaireRule,
  projectOverview: any,
  hiddenIds: string[] = [],
): boolean {
  if (!rule.enabled) return false;
  if (rule.blockType !== 'question') return false;
  if (!rule.questionText) return false;
  if (hiddenIds.includes(rule.id)) return false;

  const cat = rule.mainCategory;
  if (cat === 'Business Overview') return true;

  if (cat === 'Project Purpose') {
    const keys = rule.purposeKeys && rule.purposeKeys.length > 0
      ? rule.purposeKeys
      : (rule.purposeKey ? [rule.purposeKey] : []);
    if (keys.length === 0) return true;

    const primaryRaw = projectOverview?.primaryProjectPurpose;
    const primary: string[] = Array.isArray(primaryRaw)
      ? primaryRaw
      : (primaryRaw ? [primaryRaw] : []);
    const secondary: string[] = Array.isArray(projectOverview?.secondaryProjectPurposes)
      ? projectOverview.secondaryProjectPurposes
      : [];
    const all = [...primary, ...secondary].filter(Boolean);
    if (all.length === 0) return true;
    return keys.some((k) => purposeMatches(k, all));
  }

  if (cat === 'Industry') {
    if (!rule.naicsCodes || rule.naicsCodes.length === 0) return true;
    const naics = String(projectOverview?.naicsCode ?? '').trim();
    if (!naics) return false;
    return rule.naicsCodes.some((code) => {
      const c = (code || '').trim();
      if (!c) return false;
      return naics.startsWith(c) || c.startsWith(naics);
    });
  }

  return false;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export interface QuestionnairePdfOptions {
  /**
   * Bytes for the bank logo placed in the page header. PNG or JPEG. When
   * omitted, the header bar still renders without a logo.
   */
  logoBytes?: Uint8Array | ArrayBuffer | null;
}

export async function generateQuestionnairePdf(
  projectName: string,
  rules: QuestionnaireRule[],
  responses: QuestionnaireResponse[],
  primaryProjectPurpose?: string,
  options?: QuestionnairePdfOptions,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const form = pdfDoc.getForm();

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
  if (options?.logoBytes) {
    try {
      logoImage = await pdfDoc.embedPng(options.logoBytes as any);
    } catch {
      try {
        logoImage = await pdfDoc.embedJpg(options.logoBytes as any);
      } catch {
        logoImage = null;
      }
    }
  }

  // Page geometry — matches the Blanks_Business_Questionnaire.pdf template.
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 34;
  const contentWidth = pageWidth - 2 * margin;
  const headerHeight = 51;
  const footerY = 34;

  // Colors
  const headerBg = rgb(0.07, 0.24, 0.5);
  const titleColor = rgb(1, 1, 1);
  const categoryColor = rgb(0.075, 0.235, 0.498);
  const subtitleColor = rgb(0.42, 0.45, 0.49);
  const questionColor = rgb(0.2, 0.2, 0.2);
  const fieldBorder = rgb(0.8, 0.8, 0.8);
  const footerColor = rgb(0.6, 0.6, 0.6);

  const exportDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const drawChrome = (page: PDFPage) => {
    // Header bar
    page.drawRectangle({
      x: 0,
      y: pageHeight - headerHeight,
      width: pageWidth,
      height: headerHeight,
      color: headerBg,
    });

    // Logo on the left
    if (logoImage) {
      const logoH = 31;
      const aspect = logoImage.width / logoImage.height;
      const logoW = logoH * aspect;
      page.drawImage(logoImage, {
        x: margin,
        y: pageHeight - headerHeight + (headerHeight - logoH) / 2,
        width: logoW,
        height: logoH,
      });
    }

    // Title on the right (right-aligned)
    const titleText = 'Business Questionnaire';
    const titleSize = 16;
    const titleWidth = helveticaBold.widthOfTextAtSize(titleText, titleSize);
    page.drawText(titleText, {
      x: pageWidth - margin - titleWidth,
      y: pageHeight - headerHeight + (headerHeight - titleSize) / 2 + 3,
      size: titleSize,
      font: helveticaBold,
      color: titleColor,
    });

    // Footer
    const footerText = 'T Bank - SBA Lending Division | Business Questionnaire';
    page.drawText(footerText, {
      x: margin,
      y: footerY,
      size: 7,
      font: helvetica,
      color: footerColor,
    });
  };

  const contentTopY = pageHeight - headerHeight - 10;
  const contentBottomY = footerY + 14;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  drawChrome(page);
  let yPosition = contentTopY;

  // Subtitle row: project name (left) + export date (right)
  if (projectName) {
    const projectLabel = stripHtml(projectName).trim();
    if (projectLabel) {
      page.drawText(projectLabel, {
        x: margin,
        y: yPosition - 11,
        size: 11,
        font: helveticaBold,
        color: subtitleColor,
      });
    }
    const dateLabel = `Exported ${exportDate}`;
    const dateWidth = helvetica.widthOfTextAtSize(dateLabel, 9);
    page.drawText(dateLabel, {
      x: pageWidth - margin - dateWidth,
      y: yPosition - 10,
      size: 9,
      font: helvetica,
      color: subtitleColor,
    });
    yPosition -= 22;
  }

  const ensureSpace = (neededHeight: number) => {
    if (yPosition - neededHeight < contentBottomY) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      drawChrome(page);
      yPosition = contentTopY;
    }
  };

  // Group rules by category, preserving questionOrder within each.
  const categoryOrder: Array<'Business Overview' | 'Project Purpose' | 'Industry'> = [
    'Business Overview',
    'Project Purpose',
    'Industry',
  ];

  const rulesByCategory = new Map<string, QuestionnaireRule[]>();
  for (const c of categoryOrder) rulesByCategory.set(c, []);
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.blockType !== 'question') continue;
    if (!rule.questionText) continue;
    const arr = rulesByCategory.get(rule.mainCategory);
    if (arr) arr.push(rule);
  }

  let questionNumber = 1;
  const fieldHeight = 54;
  const lineHeight = 11;
  const questionFontSize = 9;

  for (const category of categoryOrder) {
    const categoryRules = (rulesByCategory.get(category) || [])
      .slice()
      .sort((a, b) => (a.questionOrder ?? a.order ?? 0) - (b.questionOrder ?? b.order ?? 0));
    if (categoryRules.length === 0) continue;

    let categoryTitle: string = category;
    if (category === 'Project Purpose' && primaryProjectPurpose) {
      categoryTitle = `${category} — ${primaryProjectPurpose}`;
    }

    // Reserve room for the header plus the first question's box so we don't
    // strand a category header at the bottom of a page.
    ensureSpace(40 + fieldHeight);

    page.drawText(categoryTitle, {
      x: margin,
      y: yPosition - 11,
      size: 11,
      font: helveticaBold,
      color: categoryColor,
    });
    yPosition -= 16;
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: pageWidth - margin, y: yPosition },
      thickness: 1.4,
      color: categoryColor,
    });
    yPosition -= 14;

    for (const rule of categoryRules) {
      const questionText = stripHtml(rule.questionText || '').trim();
      if (!questionText) continue;
      const numbered = `${questionNumber}. ${questionText}`;
      const wrapped = wrapText(numbered, helvetica, questionFontSize, contentWidth);
      const totalNeeded = wrapped.length * lineHeight + 6 + fieldHeight + 12;

      ensureSpace(totalNeeded);

      for (const line of wrapped) {
        page.drawText(line, {
          x: margin,
          y: yPosition - questionFontSize,
          size: questionFontSize,
          font: helvetica,
          color: questionColor,
        });
        yPosition -= lineHeight;
      }
      yPosition -= 6;

      const textField = form.createTextField(`q_${rule.id}`);
      textField.addToPage(page, {
        x: margin,
        y: yPosition - fieldHeight,
        width: contentWidth,
        height: fieldHeight,
        borderWidth: 0.85,
        borderColor: fieldBorder,
      });
      textField.enableMultiline();
      textField.setFontSize(9);

      const response = responses.find(r => r.ruleId === rule.id);
      if (response?.content) {
        const text = stripHtml(response.content);
        if (text) textField.setText(text);
      }

      yPosition -= fieldHeight + 12;
      questionNumber++;
    }

    yPosition -= 6;
  }

  return pdfDoc.save();
}
