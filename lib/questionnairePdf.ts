import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
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

export async function generateQuestionnairePdf(
  projectName: string,
  rules: QuestionnaireRule[],
  responses: QuestionnaireResponse[],
  primaryProjectPurpose?: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const form = pdfDoc.getForm();

  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page dimensions
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;

  // Colors
  const blueColor = rgb(0.145, 0.388, 0.922); // #2563eb
  const grayColor = rgb(0.42, 0.45, 0.49); // #6b7280
  const blackColor = rgb(0, 0, 0);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  // Helper to add a new page when needed
  const ensureSpace = (neededHeight: number) => {
    if (yPosition - neededHeight < margin + 50) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
    }
  };

  // Draw header
  page.drawText('Business Questionnaire', {
    x: margin,
    y: yPosition,
    size: 24,
    font: helveticaBold,
    color: blackColor,
  });
  yPosition -= 28;

  page.drawText(projectName, {
    x: margin,
    y: yPosition,
    size: 14,
    font: helvetica,
    color: grayColor,
  });
  yPosition -= 18;

  const exportDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  page.drawText(`Exported: ${exportDate}`, {
    x: margin,
    y: yPosition,
    size: 10,
    font: helvetica,
    color: grayColor,
  });
  yPosition -= 40;

  // Group rules by category
  const categoryOrder: Array<'Business Overview' | 'Project Purpose' | 'Industry'> = [
    'Business Overview',
    'Project Purpose',
    'Industry',
  ];

  const rulesByCategory = new Map<string, QuestionnaireRule[]>();
  for (const category of categoryOrder) {
    rulesByCategory.set(category, []);
  }

  for (const rule of rules) {
    if (rule.enabled && rule.blockType === 'question' && rule.questionText) {
      const categoryRules = rulesByCategory.get(rule.mainCategory) || [];
      categoryRules.push(rule);
      rulesByCategory.set(rule.mainCategory, categoryRules);
    }
  }

  let questionNumber = 1;

  // Draw each category section
  for (const category of categoryOrder) {
    const categoryRules = rulesByCategory.get(category) || [];
    if (categoryRules.length === 0) continue;

    // Category header
    ensureSpace(60);

    let categoryTitle: string = category;
    if (category === 'Project Purpose' && primaryProjectPurpose) {
      categoryTitle = `${category} - ${primaryProjectPurpose}`;
    }

    page.drawText(categoryTitle, {
      x: margin,
      y: yPosition,
      size: 18,
      font: helveticaBold,
      color: blueColor,
    });
    yPosition -= 6;

    // Blue underline
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: pageWidth - margin, y: yPosition },
      thickness: 2,
      color: blueColor,
    });
    yPosition -= 25;

    // Draw questions in this category
    for (const rule of categoryRules) {
      const questionText = `${questionNumber}. ${rule.questionText}`;
      const response = responses.find(r => r.ruleId === rule.id);
      const responseText = response ? stripHtml(response.content) : '';

      // Wrap question text
      const wrappedQuestion = wrapText(questionText, helveticaBold, 11, contentWidth);
      const questionHeight = wrappedQuestion.length * 16;
      const fieldHeight = 100;
      const totalNeeded = questionHeight + fieldHeight + 30;

      ensureSpace(totalNeeded);

      // Draw question text (bold)
      for (const line of wrappedQuestion) {
        page.drawText(line, {
          x: margin,
          y: yPosition,
          size: 11,
          font: helveticaBold,
          color: blackColor,
        });
        yPosition -= 16;
      }
      yPosition -= 8;

      // Create fillable text field with gray background
      const textField = form.createTextField(`question_${questionNumber}`);
      textField.addToPage(page, {
        x: margin,
        y: yPosition - fieldHeight,
        width: contentWidth,
        height: fieldHeight,
        borderWidth: 1,
        borderColor: rgb(0.8, 0.8, 0.8),
        backgroundColor: rgb(0.96, 0.96, 0.96), // Light gray background
      });

      textField.enableMultiline();
      textField.setFontSize(10);

      if (responseText) {
        textField.setText(responseText);
      }

      yPosition -= fieldHeight + 25;
      questionNumber++;
    }
  }

  return pdfDoc.save();
}
