import { NextResponse } from 'next/server';
import { OpenAIStream, StreamingTextResponse } from '@vercel/ai';
import { translate } from '../../../lib/translation';

export const runtime = 'edge';

export async function POST(req) {
  const { prompt } = await req.json();
  const [sourceLang, targetLang, country, sourceText] = prompt.split('\n');

  const stream = OpenAIStream(await translate(sourceLang, targetLang, sourceText, country));
  return new StreamingTextResponse(stream);
}