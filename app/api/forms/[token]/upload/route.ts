import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage, Timestamp } from '@/lib/firebaseAdmin';
import { extractPdfFields } from '@/lib/pdf-extraction';
import { ExtractionStatus, ExtractedFieldStatus } from '@/types';
import { logAuditEvent, getClientIp } from '@/lib/auditLog';

// Allowed file types for upload
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// Max file size: 25MB
const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Max number of files per upload session
const MAX_FILES_PER_UPLOAD = 10;

// Simple rate limiting: track uploads per token
const uploadCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // Max uploads per minute per token

// Interface for base64 file data
interface FileData {
  name: string;
  type: string;
  size: number;
  data: string; // base64 encoded
}

function checkRateLimit(token: string): boolean {
  const now = Date.now();
  const record = uploadCounts.get(token);

  if (!record || now > record.resetAt) {
    uploadCounts.set(token, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * POST /api/forms/[token]/upload
 * Upload completed documents (public access via token)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Rate limiting
    if (!checkRateLimit(token)) {
      return NextResponse.json(
        { error: 'Too many uploads. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    // Validate the token
    const tokenDoc = await adminDb.collection('formPortalTokens').doc(token).get();

    if (!tokenDoc.exists) {
      return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
    }

    const tokenData = tokenDoc.data();

    if (tokenData?.isRevoked) {
      return NextResponse.json({ error: 'Link has been revoked' }, { status: 403 });
    }

    const expiresAt = tokenData?.expiresAt?.toDate ? tokenData.expiresAt.toDate() : new Date(tokenData?.expiresAt);
    if (new Date() > expiresAt) {
      return NextResponse.json({ error: 'Link has expired' }, { status: 403 });
    }

    const projectId = tokenData?.projectId;

    // Parse the JSON body (files are now sent as base64)
    const body = await request.json();
    const files: FileData[] = body.files || [];
    const relatedFormId: string | null = body.relatedFormId || null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES_PER_UPLOAD} files allowed per upload` },
        { status: 400 }
      );
    }

    const uploadResults: Array<{ filename: string; success: boolean; error?: string }> = [];
    const bucket = adminStorage.bucket();

    for (const file of files) {
      try {
        // Calculate expected base64 length for the file size
        // Base64 encoding increases size by ~33% (4 chars for every 3 bytes)
        const expectedBase64Length = Math.ceil(file.size / 3) * 4;
        const actualBase64Length = file.data?.length || 0;
        const base64LengthRatio = actualBase64Length / expectedBase64Length;

        console.log('[Forms Portal Upload] RECEIVED FILE:', {
          name: file.name,
          type: file.type,
          reportedSize: file.size,
          base64Length: actualBase64Length,
          expectedBase64Length: expectedBase64Length,
          base64LengthOK: base64LengthRatio > 0.95 && base64LengthRatio < 1.05 ? '✓' : '✗',
          base64Start: file.data?.substring(0, 30),
        });

        // Validate file type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          uploadResults.push({
            filename: file.name,
            success: false,
            error: `File type not allowed. Accepted types: PDF, images, Word, Excel`,
          });
          continue;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          uploadResults.push({
            filename: file.name,
            success: false,
            error: `File too large. Maximum size is 25MB`,
          });
          continue;
        }

        // Decode base64 data to Buffer - this is the reliable approach
        // that works correctly in Node.js (same as pdf-imports route)
        const buffer = Buffer.from(file.data, 'base64');

        console.log('[Forms Portal Upload] Buffer created:', {
          name: file.name,
          expectedSize: file.size,
          actualBufferSize: buffer.length,
          sizeMatch: buffer.length === file.size,
        });

        // Verify sizes match
        if (buffer.length !== file.size) {
          console.error('[Forms Portal Upload] Buffer size mismatch!', {
            expected: file.size,
            actual: buffer.length,
          });
        }

        // Verify PDF header for PDF files
        if (file.type === 'application/pdf') {
          const header = buffer.slice(0, 8).toString('ascii');
          console.log('[Forms Portal Upload] PDF header check:', {
            header,
            isPDF: header.startsWith('%PDF'),
            firstBytes: Array.from(buffer.slice(0, 20)),
          });

          if (!header.startsWith('%PDF')) {
            console.error('[Forms Portal Upload] Invalid PDF header - file may be corrupted');
          }
        }

        // Generate storage path
        const timestamp = Date.now();
        const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `borrower-uploads/${projectId}/${timestamp}_${safeFilename}`;

        const fileRef = bucket.file(storagePath);
        await fileRef.save(buffer, {
          metadata: {
            contentType: file.type,
            metadata: {
              projectId,
              originalName: file.name,
              uploadedVia: 'borrower-portal',
            },
          },
        });

        // Store metadata in database
        const uploadData: Record<string, unknown> = {
          projectId,
          filename: safeFilename,
          originalName: file.name,
          storagePath,
          uploadedAt: Timestamp.now(),
          fileSize: file.size,
          mimeType: file.type,
          extractionStatus: 'pending' as ExtractionStatus,
          ...(relatedFormId && { relatedFormId }),
        };

        const uploadRef = await adminDb
          .collection('projects')
          .doc(projectId)
          .collection('borrowerUploads')
          .add(uploadData);

        // Automatically extract data from PDF files
        if (file.type === 'application/pdf') {
          try {
            // Update status to extracting
            await uploadRef.update({
              extractionStatus: 'extracting' as ExtractionStatus,
            });

            // Extract fields from PDF
            const extractionResult = await extractPdfFields(buffer);

            // DIAGNOSTIC: Log extraction results to understand what's happening
            console.log('[Forms Portal Upload] EXTRACTION RESULT:', {
              success: extractionResult.success,
              formType: extractionResult.formType,
              totalFields: extractionResult.totalFields,
              filledFields: extractionResult.filledFields,
              mappedFields: extractionResult.mappedFields,
              possibleIssues: extractionResult.possibleIssues,
              error: extractionResult.error,
            });

            // Log first 5 fields with their actual values for debugging
            const sampleFields = extractionResult.fields.slice(0, 5).map(f => ({
              name: f.pdfFieldName,
              type: f.pdfFieldType,
              rawValue: f.rawValue,
              hasValue: f.rawValue !== null && f.rawValue !== '' && f.rawValue !== false,
            }));
            console.log('[Forms Portal Upload] SAMPLE FIELDS:', JSON.stringify(sampleFields, null, 2));

            // Count fields with actual values
            const fieldsWithValues = extractionResult.fields.filter(
              f => f.rawValue !== null && f.rawValue !== '' && f.rawValue !== false
            );
            console.log('[Forms Portal Upload] FIELDS WITH VALUES:', {
              count: fieldsWithValues.length,
              fieldNames: fieldsWithValues.map(f => f.pdfFieldName),
            });

            if (extractionResult.success) {
              // Convert extraction result to storage format
              const extractedFields = extractionResult.fields.map((field) => ({
                pdfFieldName: field.pdfFieldName,
                rawValue: field.rawValue,
                mappedSection: field.mappedSection || null,
                mappedPath: field.mappedPath || null,
                mappedLabel: field.mappedLabel || null,
                transformedValue: field.transformedValue ?? field.rawValue,
                confidence: field.confidence,
                status: 'pending' as ExtractedFieldStatus,
              }));

              // DIAGNOSTIC: Log what we're about to store
              const fieldsToStore = extractedFields.filter(f => f.rawValue !== null && f.rawValue !== '');
              console.log('[Forms Portal Upload] STORING TO DATABASE:', {
                uploadId: uploadRef.id,
                totalFieldsToStore: extractedFields.length,
                fieldsWithValuesToStore: fieldsToStore.length,
                sampleStoredFields: fieldsToStore.slice(0, 3).map(f => ({
                  name: f.pdfFieldName,
                  rawValue: f.rawValue,
                })),
              });

              // Create extraction record
              const extractionRef = await adminDb
                .collection('projects')
                .doc(projectId)
                .collection('borrowerUploads')
                .doc(uploadRef.id)
                .collection('extractions')
                .add({
                  uploadId: uploadRef.id,
                  projectId,
                  formType: extractionResult.formType,
                  formName: extractionResult.formName,
                  extractedAt: Timestamp.now(),
                  status: 'extracted' as ExtractionStatus,
                  fields: extractedFields,
                  totalFields: extractionResult.totalFields,
                  mappedFields: extractionResult.mappedFields,
                  filledFields: extractionResult.filledFields,
                  averageConfidence: extractionResult.averageConfidence,
                  possibleIssues: extractionResult.possibleIssues,
                });

              console.log('[Forms Portal Upload] EXTRACTION STORED:', {
                extractionId: extractionRef.id,
                path: `projects/${projectId}/borrowerUploads/${uploadRef.id}/extractions/${extractionRef.id}`,
              });

              // Update upload with extraction status and reference
              await uploadRef.update({
                extractionStatus: 'extracted' as ExtractionStatus,
                detectedFormType: extractionResult.formType,
                extractionId: extractionRef.id,
              });
            } else {
              // Extraction failed
              const extractionRef = await adminDb
                .collection('projects')
                .doc(projectId)
                .collection('borrowerUploads')
                .doc(uploadRef.id)
                .collection('extractions')
                .add({
                  uploadId: uploadRef.id,
                  projectId,
                  formType: null,
                  extractedAt: Timestamp.now(),
                  status: 'failed' as ExtractionStatus,
                  fields: [],
                  totalFields: 0,
                  mappedFields: 0,
                  averageConfidence: 0,
                  error: extractionResult.error,
                });

              await uploadRef.update({
                extractionStatus: 'failed' as ExtractionStatus,
                extractionId: extractionRef.id,
              });
            }
          } catch (extractError) {
            console.error(`[Forms Portal Upload] Extraction error for ${file.name}:`, extractError);
            await uploadRef.update({
              extractionStatus: 'failed' as ExtractionStatus,
            });
          }
        } else {
          // Non-PDF files don't need extraction
          await uploadRef.update({
            extractionStatus: 'not_applicable' as ExtractionStatus,
          });
        }

        uploadResults.push({
          filename: file.name,
          success: true,
        });
      } catch (fileError) {
        console.error(`[Forms Portal Upload] Error uploading file ${file.name}:`, fileError);
        uploadResults.push({
          filename: file.name,
          success: false,
          error: 'Failed to upload file',
        });
      }
    }

    const successCount = uploadResults.filter((r) => r.success).length;
    const failureCount = uploadResults.filter((r) => !r.success).length;

    // Audit: borrower file uploads
    if (successCount > 0) {
      const fileNames = uploadResults.filter(r => r.success).map(r => r.filename);
      logAuditEvent({
        action: 'file_uploaded',
        category: 'file',
        projectId,
        resourceType: 'file',
        resourceId: projectId,
        summary: `Borrower uploaded ${successCount} file(s) via portal: ${fileNames.join(', ')}`,
        metadata: { fileNames, successCount, failureCount, tokenPrefix: token.substring(0, 8) },
        ipAddress: getClientIp(request.headers),
        userAgent: request.headers.get('user-agent') || undefined,
      }).catch(() => {});
    }

    return NextResponse.json({
      message: `Successfully uploaded ${successCount} file(s)${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      results: uploadResults,
      successCount,
      failureCount,
    });
  } catch (error) {
    console.error('[Forms Portal Upload] Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}
