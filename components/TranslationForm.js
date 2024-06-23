'use client';

import { useState } from 'react';
import { useCompletion } from '@vercel/ai/react';

export default function TranslationForm() {
  const [sourceLang, setSourceLang] = useState('English');
  const [targetLang, setTargetLang] = useState('Spanish');
  const [country, setCountry] = useState('Mexico');

  const { complete } = useCompletion({
    api: '/api/translate',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const sourceText = e.target.sourceText.value;
    await complete(`${sourceLang}\n${targetLang}\n${country}\n${sourceText}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex space-x-4">
        <input
          type="text"
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          placeholder="Source Language"
          className="border p-2 rounded"
        />
        <input
          type="text"
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          placeholder="Target Language"
          className="border p-2 rounded"
        />
        <input
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Country"
          className="border p-2 rounded"
        />
      </div>
      <textarea
        name="sourceText"
        placeholder="Enter text to translate"
        className="w-full h-32 border p-2 rounded"
      ></textarea>
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
        Translate
      </button>
    </form>
  );
}