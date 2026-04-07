import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup } from 'pdf-lib';
import { ExtractedField, PdfImportSession } from '@/types';
import { checkCsrf } from '@/lib/csrf';

// Helper to verify auth token
async function verifyAuthToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('[PDF Import] Token verification failed:', error);
    return null;
  }
}

// Field name patterns for auto-suggestion
const FIELD_PATTERNS: Record<string, { section: string; path: string; confidence: number }> = {
  // Business name patterns
  'business_name': { section: 'businessApplicant', path: 'businessName', confidence: 0.9 },
  'company_name': { section: 'businessApplicant', path: 'businessName', confidence: 0.9 },
  'legal_name': { section: 'businessApplicant', path: 'legalName', confidence: 0.9 },
  'dba': { section: 'businessApplicant', path: 'dbaName', confidence: 0.8 },

  // Address patterns
  'address': { section: 'businessApplicant', path: 'address.street1', confidence: 0.7 },
  'street': { section: 'businessApplicant', path: 'address.street1', confidence: 0.8 },
  'city': { section: 'businessApplicant', path: 'address.city', confidence: 0.9 },
  'state': { section: 'businessApplicant', path: 'address.state', confidence: 0.9 },
  'zip': { section: 'businessApplicant', path: 'address.zipCode', confidence: 0.9 },

  // EIN/Tax ID
  'ein': { section: 'businessApplicant', path: 'ein', confidence: 0.95 },
  'tax_id': { section: 'businessApplicant', path: 'ein', confidence: 0.9 },
  'fein': { section: 'businessApplicant', path: 'ein', confidence: 0.9 },

  // Loan amount
  'loan_amount': { section: 'fundingStructure', path: 'totalLoanAmount', confidence: 0.9 },
  'amount_requested': { section: 'fundingStructure', path: 'totalLoanAmount', confidence: 0.85 },

  // Individual/Owner info
  'owner_name': { section: 'individualApplicants', path: 'owners[0].name', confidence: 0.8 },
  'applicant_name': { section: 'individualApplicants', path: 'owners[0].name', confidence: 0.8 },
  'ssn': { section: 'individualApplicants', path: 'owners[0].ssn', confidence: 0.95 },
  'date_of_birth': { section: 'individualApplicants', path: 'owners[0].dateOfBirth', confidence: 0.9 },
  'dob': { section: 'individualApplicants', path: 'owners[0].dateOfBirth', confidence: 0.9 },
};

function generateSuggestions(extractedFields: ExtractedField[]) {
  const suggestions: Array<{
    pdfFieldName: string;
    suggestedSection: string;
    suggestedPath: string;
    confidence: number;
  }> = [];

  for (const field of extractedFields) {
    const normalizedName = field.name.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Check for exact or partial matches
    for (const [pattern, mapping] of Object.entries(FIELD_PATTERNS)) {
      if (normalizedName.includes(pattern) || pattern.includes(normalizedName)) {
        suggestions.push({
          pdfFieldName: field.name,
          suggestedSection: mapping.section,
          suggestedPath: mapping.path,
          confidence: mapping.confidence,
        });
        break;
      }
    }
  }

  return suggestions;
}

/**
 * POST /api/pdf-imports/upload
 * Upload a PDF and extract form fields
 */
export async function POST(request: NextRequest) {
  // CSRF protection
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  try {
    const userId = await verifyAuthToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, fileName, pdfData } = body;

    if (!projectId || !fileName || !pdfData) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, fileName, pdfData' },
        { status: 400 }
      );
    }

    // Decode base64 PDF data
    const pdfBytes = Buffer.from(pdfData, 'base64');

    // Load the PDF document
    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(pdfBytes);
    } catch (error) {
      console.error('[PDF Import] Failed to load PDF:', error);
      return NextResponse.json(
        { error: 'Invalid or corrupted PDF file' },
        { status: 400 }
      );
    }

    // Extract form fields
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    const extractedFields: ExtractedField[] = fields.map((field) => {
      const name = field.getName();
      let value: string | boolean | null = null;
      let type = 'text';

      try {
        // Use instanceof checks instead of constructor.name comparisons.
        // constructor.name gets mangled by bundlers (Turbopack/Webpack).
        if (field instanceof PDFTextField) {
          value = field.getText() || null;
          type = 'text';
        } else if (field instanceof PDFCheckBox) {
          value = field.isChecked();
          type = 'checkbox';
        } else if (field instanceof PDFDropdown) {
          const selected = field.getSelected();
          value = selected.length > 0 ? selected[0] : null;
          type = 'dropdown';
        } else if (field instanceof PDFRadioGroup) {
          value = field.getSelected() || null;
          type = 'radio';
        }
      } catch (e) {
        // Field might not be accessible, skip
        console.warn(`[PDF Import] Could not read field ${name}:`, e);
      }

      return { name, type, value };
    });

    // Get user info
    const userRecord = await adminAuth.getUser(userId);

    // Create import session
    const sessionData = {
      projectId,
      fileName,
      fileSize: pdfBytes.length,
      extractedFields,
      appliedMappings: [],
      status: 'uploaded' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      createdByName: userRecord.displayName || userRecord.email || 'Unknown',
    };

    const docRef = await adminDb.collection('pdfImportSessions').add(sessionData);

    // Generate mapping suggestions
    const suggestions = generateSuggestions(extractedFields);

    return NextResponse.json({
      session: {
        id: docRef.id,
        ...sessionData,
      },
      suggestions,
    });
  } catch (error) {
    console.error('[PDF Import] Upload error:', error);
    return NextResponse.json({ error: 'Failed to process PDF' }, { status: 500 });
  }
}
