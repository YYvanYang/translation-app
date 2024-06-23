'use client';

import { useCompletion } from '@vercel/ai/react';

export default function TranslationResult() {
  const { completion } = useCompletion({
    api: '/api/translate',
  });

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-2">Translation Result:</h2>
      <div className="border p-4 rounded min-h-[100px] whitespace-pre-wrap">
        {completion}
      </div>
    </div>
  );
}