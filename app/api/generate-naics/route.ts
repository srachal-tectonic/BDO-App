import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { adminDb } from '@/lib/firebaseAdmin';
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
 * Generate NAICS Code Suggestions API
 * POST /api/generate-naics
 *
 * Uses OpenAI to suggest NAICS codes based on industry description.
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
    'generate-naics',
    RATE_LIMITS.ai
  );

  if (!rateLimitResult.allowed) {
    return rateLimitExceededResponse(rateLimitResult);
  }

  try {
    const body = await request.json();
    const { industry } = body;

    // Validate input
    if (!industry || typeof industry !== 'string' || industry.trim() === '') {
      return NextResponse.json(
        { error: 'Industry field is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    console.log('Generating NAICS suggestions for industry:', industry);

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please add your API key to the .env.local file.' },
        { status: 500 }
      );
    }

    // Get the prompt from the database or use default
    let promptTemplate = `Based on the industry "{industry}", suggest the top 3 most appropriate NAICS codes (6-digit codes).

Return a JSON object with a "suggestions" array containing exactly 3 objects, each with:
- code: the 6-digit NAICS code (as a string)
- title: the official NAICS title
- description: a brief explanation of why this code is appropriate for this industry

Example format:
{
  "suggestions": [
    {
      "code": "722511",
      "title": "Full-Service Restaurants",
      "description": "Fits businesses providing food services with wait staff"
    }
  ]
}`;

    try {
      // Try to fetch custom prompt from admin settings
      const docSnap = await adminDb.collection('adminSettings').doc('config').get();

      if (docSnap.exists()) {
        const settings = docSnap.data();
        const naicsPrompt = settings.aiPrompts?.find((p: any) => p.id === 'naics-suggestion');
        if (naicsPrompt && naicsPrompt.prompt) {
          promptTemplate = naicsPrompt.prompt;
          console.log('Using custom NAICS prompt from admin settings');
        }
      }
    } catch (error) {
      console.warn('Could not load custom prompt from admin settings, using default:', error);
    }

    // Replace {industry} placeholder with actual industry value
    const finalPrompt = promptTemplate.replace(/{industry}/g, industry);

    // Call OpenAI API
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: finalPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    let result = JSON.parse(responseText);

    // Handle both array and object responses
    let suggestions = [];
    if (Array.isArray(result)) {
      suggestions = result;
    } else if (result.suggestions && Array.isArray(result.suggestions)) {
      suggestions = result.suggestions;
    } else {
      // Try to find any array in the response
      const arrayKey = Object.keys(result).find(key => Array.isArray(result[key]));
      if (arrayKey) {
        suggestions = result[arrayKey];
      }
    }

    // Normalize the response format to match what the component expects
    // Component expects: code, description (NAICS title), explanation (why it fits)
    const normalizedSuggestions = suggestions.map((item: any) => ({
      code: item.code || '',
      description: item.title || '',  // NAICS title
      explanation: item.description || item.explanation || '',  // Why it's appropriate
    }));

    console.log(`Generated ${normalizedSuggestions.length} NAICS suggestions`);

    const response = NextResponse.json({
      suggestions: normalizedSuggestions,
    });

    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error: any) {
    console.error('Error in generate-naics API:', error);

    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'OpenAI API quota exceeded. Please check your OpenAI account.' },
        { status: 500 }
      );
    }

    if (error.code === 'invalid_api_key') {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key. Please check your configuration.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate NAICS suggestions' },
      { status: 500 }
    );
  }
}
