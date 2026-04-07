import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { PdfMappingTemplate, PdfFieldMapping } from '@/types';
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
    console.error('[PDF Templates] Token verification failed:', error);
    return null;
  }
}

/**
 * GET /api/pdf-templates
 * Returns all PDF mapping templates
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuthToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const snapshot = await adminDb
      .collection('pdfMappingTemplates')
      .orderBy('createdAt', 'desc')
      .get();

    const templates: PdfMappingTemplate[] = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as PdfMappingTemplate[];

    return NextResponse.json(templates);
  } catch (error) {
    console.error('[PDF Templates] Error getting templates:', error);
    return NextResponse.json({ error: 'Failed to get templates' }, { status: 500 });
  }
}

/**
 * POST /api/pdf-templates
 * Creates a new PDF mapping template
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
    const { name, sourceFormName, mappings } = body;

    if (!name || !sourceFormName || !mappings) {
      return NextResponse.json(
        { error: 'Missing required fields: name, sourceFormName, mappings' },
        { status: 400 }
      );
    }

    // Get user info for createdBy fields
    const userRecord = await adminAuth.getUser(userId);

    const templateData = {
      name,
      sourceFormName,
      mappings: mappings as PdfFieldMapping[],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      createdByName: userRecord.displayName || userRecord.email || 'Unknown',
    };

    const docRef = await adminDb.collection('pdfMappingTemplates').add(templateData);

    return NextResponse.json({
      id: docRef.id,
      ...templateData,
    });
  } catch (error) {
    console.error('[PDF Templates] Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
