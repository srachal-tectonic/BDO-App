import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifyAuth, unauthorizedResponse } from '@/lib/apiAuth';
import { checkRateLimit, rateLimitExceededResponse, addRateLimitHeaders, RATE_LIMITS } from '@/lib/rateLimit';
import { checkCsrf } from '@/lib/csrf';

// Lazy initialization of OpenAI client to avoid deployment timeouts
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Generate Questionnaire Content API
 * POST /api/generate-questionnaire-content
 *
 * Uses OpenAI to generate questionnaire content.
 * PROTECTED: Requires authentication.
 * RATE LIMITED: 10 requests per minute per user (AI operations are expensive).
 */
export async function POST(request: NextRequest) {
  // CSRF protection
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  // Verify authentication
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  // Check rate limit (AI routes have stricter limits)
  const rateLimitResult = checkRateLimit(
    authResult.user.uid,
    'generate-questionnaire-content',
    RATE_LIMITS.ai
  );

  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(rateLimitResult);
  }

  try {
    const body = await request.json();
    const { templateId, inputData, projectData } = body;

    if (!templateId || !inputData || !projectData) {
      return NextResponse.json(
        { error: 'Missing required fields: templateId, inputData, or projectData' },
        { status: 400 }
      );
    }

    // Get the template prompt - in a real implementation, this would come from the database
    // For now, we'll use a default prompt structure
    let prompt = `Generate professional business questionnaire content based on the following information:

Project Name: ${projectData.projectName}
Industry: ${projectData.industry}
NAICS Code: ${projectData.naicsCode}
Primary Purpose: ${projectData.primaryProjectPurpose}

Input Data:
${Object.entries(inputData).map(([key, value]) => `${key}: ${value}`).join('\n')}

Please generate detailed, professional content that addresses the questionnaire requirements. Format the response as HTML with proper paragraph tags and formatting.`;

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional business loan analyst helping to complete business questionnaires. Generate clear, concise, and professional content formatted as HTML.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const generatedContent = completion.choices[0]?.message?.content || '';

    const response = NextResponse.json({
      content: generatedContent,
      success: true,
    });

    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error: any) {
    console.error('Error generating questionnaire content:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate content' },
      { status: 500 }
    );
  }
}
