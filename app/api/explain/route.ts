import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { text, caseName } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful legal assistant explaining UK Supreme Court judgments. Explain the following legal text in simple, plain English for a non-lawyer. Keep it brief (under 3 sentences). Focus on what it means in practical terms.`,
        },
        {
          role: 'user',
          content: `From the case "${caseName}":\n\n${text}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const explanation = completion.choices[0]?.message?.content ||
      'Unable to generate explanation.';

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 }
    );
  }
}
