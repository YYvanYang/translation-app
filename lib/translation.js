import OpenAI from 'openai';
import tiktoken from 'tiktoken';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitters';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_TOKENS_PER_CHUNK = 1000;

async function getCompletion(prompt, systemMessage = "You are a helpful assistant.", model = "gpt-4-turbo", temperature = 0.3, jsonMode = false) {
  const messages = [
    { role: "system", content: systemMessage },
    { role: "user", content: prompt }
  ];

  const response = await openai.chat.completions.create({
    model: model,
    messages: messages,
    temperature: temperature,
    max_tokens: 1000,
    top_p: 1,
    ...(jsonMode && { response_format: { type: "json_object" } })
  });

  return jsonMode ? JSON.parse(response.choices[0].message.content) : response.choices[0].message.content;
}

function numTokensInString(inputStr, encodingName = "cl100k_base") {
  const encoding = tiktoken.encoding_for_model(encodingName);
  const tokens = encoding.encode(inputStr);
  return tokens.length;
}

function calculateChunkSize(tokenCount, tokenLimit) {
  if (tokenCount <= tokenLimit) {
    return tokenCount;
  }

  const numChunks = Math.ceil(tokenCount / tokenLimit);
  let chunkSize = Math.floor(tokenCount / numChunks);

  const remainingTokens = tokenCount % tokenLimit;
  if (remainingTokens > 0) {
    chunkSize += Math.floor(remainingTokens / numChunks);
  }

  return chunkSize;
}

async function oneChunkInitialTranslation(sourceLang, targetLang, sourceText) {
  const systemMessage = `You are an expert linguist, specializing in translation from ${sourceLang} to ${targetLang}.`;
  const translationPrompt = `This is a ${sourceLang} to ${targetLang} translation, please provide the ${targetLang} translation for this text. Do not provide any explanations or text apart from the translation.
${sourceLang}: ${sourceText}

${targetLang}:`;

  return await getCompletion(translationPrompt, systemMessage);
}

async function oneChunkReflectOnTranslation(sourceLang, targetLang, sourceText, translation1, country = "") {
  const systemMessage = `You are an expert linguist specializing in translation from ${sourceLang} to ${targetLang}. You will be provided with a source text and its translation and your goal is to improve the translation.`;

  let reflectionPrompt = `Your task is to carefully read a source text and a translation from ${sourceLang} to ${targetLang}, and then give constructive criticism and helpful suggestions to improve the translation. `;

  if (country) {
    reflectionPrompt += `The final style and tone of the translation should match the style of ${targetLang} colloquially spoken in ${country}. `;
  }

  reflectionPrompt += `
The source text and initial translation, delimited by XML tags <SOURCE_TEXT></SOURCE_TEXT> and <TRANSLATION></TRANSLATION>, are as follows:

<SOURCE_TEXT>
${sourceText}
</SOURCE_TEXT>

<TRANSLATION>
${translation1}
</TRANSLATION>

When writing suggestions, pay attention to whether there are ways to improve the translation's:
(i) accuracy (by correcting errors of addition, mistranslation, omission, or untranslated text),
(ii) fluency (by applying ${targetLang} grammar, spelling and punctuation rules, and ensuring there are no unnecessary repetitions),
(iii) style (by ensuring the translations reflect the style of the source text and takes into account any cultural context),
(iv) terminology (by ensuring terminology use is consistent and reflects the source text domain; and by only ensuring you use equivalent idioms ${targetLang}).

Write a list of specific, helpful and constructive suggestions for improving the translation.
Each suggestion should address one specific part of the translation.
Output only the suggestions and nothing else.`;

  return await getCompletion(reflectionPrompt, systemMessage);
}

async function oneChunkImproveTranslation(sourceLang, targetLang, sourceText, translation1, reflection) {
  const systemMessage = `You are an expert linguist, specializing in translation editing from ${sourceLang} to ${targetLang}.`;

  const prompt = `Your task is to carefully read, then edit, a translation from ${sourceLang} to ${targetLang}, taking into
account a list of expert suggestions and constructive criticisms.

The source text, the initial translation, and the expert linguist suggestions are delimited by XML tags <SOURCE_TEXT></SOURCE_TEXT>, <TRANSLATION></TRANSLATION> and <EXPERT_SUGGESTIONS></EXPERT_SUGGESTIONS> as follows:

<SOURCE_TEXT>
${sourceText}
</SOURCE_TEXT>

<TRANSLATION>
${translation1}
</TRANSLATION>

<EXPERT_SUGGESTIONS>
${reflection}
</EXPERT_SUGGESTIONS>

Please take into account the expert suggestions when editing the translation. Edit the translation by ensuring:

(i) accuracy (by correcting errors of addition, mistranslation, omission, or untranslated text),
(ii) fluency (by applying ${targetLang} grammar, spelling and punctuation rules and ensuring there are no unnecessary repetitions),
(iii) style (by ensuring the translations reflect the style of the source text)
(iv) terminology (inappropriate for context, inconsistent use), or
(v) other errors.

Output only the new translation and nothing else.`;

  return await getCompletion(prompt, systemMessage);
}

async function oneChunkTranslateText(sourceLang, targetLang, sourceText, country = "") {
  const translation1 = await oneChunkInitialTranslation(sourceLang, targetLang, sourceText);
  const reflection = await oneChunkReflectOnTranslation(sourceLang, targetLang, sourceText, translation1, country);
  const translation2 = await oneChunkImproveTranslation(sourceLang, targetLang, sourceText, translation1, reflection);
  return translation2;
}

async function multichunkInitialTranslation(sourceLang, targetLang, sourceTextChunks) {
  const systemMessage = `You are an expert linguist, specializing in translation from ${sourceLang} to ${targetLang}.`;

  const translationPrompt = `Your task is provide a professional translation from ${sourceLang} to ${targetLang} of PART of a text.

The source text is below, delimited by XML tags <SOURCE_TEXT> and </SOURCE_TEXT>. Translate only the part within the source text
delimited by <TRANSLATE_THIS> and </TRANSLATE_THIS>. You can use the rest of the source text as context, but do not translate any
of the other text. Do not output anything other than the translation of the indicated part of the text.

<SOURCE_TEXT>
{tagged_text}
</SOURCE_TEXT>

To reiterate, you should translate only this part of the text, shown here again between <TRANSLATE_THIS> and </TRANSLATE_THIS>:
<TRANSLATE_THIS>
{chunk_to_translate}
</TRANSLATE_THIS>

Output only the translation of the portion you are asked to translate, and nothing else.`;

  const translationChunks = [];
  for (let i = 0; i < sourceTextChunks.length; i++) {
    const taggedText = sourceTextChunks.slice(0, i).join('') +
      "<TRANSLATE_THIS>" + sourceTextChunks[i] + "</TRANSLATE_THIS>" +
      sourceTextChunks.slice(i + 1).join('');

    const prompt = translationPrompt
      .replace('{tagged_text}', taggedText)
      .replace('{chunk_to_translate}', sourceTextChunks[i]);

    const translation = await getCompletion(prompt, systemMessage);
    translationChunks.push(translation);
  }

  return translationChunks;
}

async function multichunkReflectOnTranslation(sourceLang, targetLang, sourceTextChunks, translation1Chunks, country = "") {
  const systemMessage = `You are an expert linguist specializing in translation from ${sourceLang} to ${targetLang}. You will be provided with a source text and its translation and your goal is to improve the translation.`;

  let reflectionPrompt = `Your task is to carefully read a source text and part of a translation of that text from ${sourceLang} to ${targetLang}, and then give constructive criticism and helpful suggestions for improving the translation. `;

  if (country) {
    reflectionPrompt += `The final style and tone of the translation should match the style of ${targetLang} colloquially spoken in ${country}. `;
  }

  reflectionPrompt += `
The source text is below, delimited by XML tags <SOURCE_TEXT> and </SOURCE_TEXT>, and the part that has been translated
is delimited by <TRANSLATE_THIS> and </TRANSLATE_THIS> within the source text. You can use the rest of the source text
as context for critiquing the translated part.

<SOURCE_TEXT>
{tagged_text}
</SOURCE_TEXT>

To reiterate, only part of the text is being translated, shown here again between <TRANSLATE_THIS> and </TRANSLATE_THIS>:
<TRANSLATE_THIS>
{chunk_to_translate}
</TRANSLATE_THIS>

The translation of the indicated part, delimited below by <TRANSLATION> and </TRANSLATION>, is as follows:
<TRANSLATION>
{translation_1_chunk}
</TRANSLATION>

When writing suggestions, pay attention to whether there are ways to improve the translation's:
(i) accuracy (by correcting errors of addition, mistranslation, omission, or untranslated text),
(ii) fluency (by applying ${targetLang} grammar, spelling and punctuation rules, and ensuring there are no unnecessary repetitions),
(iii) style (by ensuring the translations reflect the style of the source text and takes into account any cultural context),
(iv) terminology (by ensuring terminology use is consistent and reflects the source text domain; and by only ensuring you use equivalent idioms ${targetLang}).

Write a list of specific, helpful and constructive suggestions for improving the translation.
Each suggestion should address one specific part of the translation.
Output only the suggestions and nothing else.`;

  const reflectionChunks = [];
  for (let i = 0; i < sourceTextChunks.length; i++) {
    const taggedText = sourceTextChunks.slice(0, i).join('') +
      "<TRANSLATE_THIS>" + sourceTextChunks[i] + "</TRANSLATE_THIS>" +
      sourceTextChunks.slice(i + 1).join('');

    const prompt = reflectionPrompt
      .replace('{tagged_text}', taggedText)
      .replace('{chunk_to_translate}', sourceTextChunks[i])
      .replace('{translation_1_chunk}', translation1Chunks[i]);

    const reflection = await getCompletion(prompt, systemMessage);
    reflectionChunks.push(reflection);
  }

  return reflectionChunks;
}

async function multichunkImproveTranslation(sourceLang, targetLang, sourceTextChunks, translation1Chunks, reflectionChunks) {
  const systemMessage = `You are an expert linguist, specializing in translation editing from ${sourceLang} to ${targetLang}.`;

  const improvementPrompt = `Your task is to carefully read, then improve, a translation from ${sourceLang} to ${targetLang}, taking into
account a set of expert suggestions and constructive critisms. Below, the source text, initial translation, and expert suggestions are provided.

The source text is below, delimited by XML tags <SOURCE_TEXT> and </SOURCE_TEXT>, and the part that has been translated
is delimited by <TRANSLATE_THIS> and </TRANSLATE_THIS> within the source text. You can use the rest of the source text
as context, but need to provide a translation only of the part indicated by <TRANSLATE_THIS> and </TRANSLATE_THIS>.

<SOURCE_TEXT>
{tagged_text}
</SOURCE_TEXT>

To reiterate, only part of the text is being translated, shown here again between <TRANSLATE_THIS> and </TRANSLATE_THIS>:
<TRANSLATE_THIS>
{chunk_to_translate}
</TRANSLATE_THIS>

The translation of the indicated part, delimited below by <TRANSLATION> and </TRANSLATION>, is as follows:
<TRANSLATION>
{translation_1_chunk}
</TRANSLATION>

The expert translations of the indicated part, delimited below by <EXPERT_SUGGESTIONS> and </EXPERT_SUGGESTIONS>, is as follows:
<EXPERT_SUGGESTIONS>
{reflection_chunk}
</EXPERT_SUGGESTIONS>

Taking into account the expert suggestions rewrite the translation to improve it, paying attention
to whether there are ways to improve the translation's

(i) accuracy (by correcting errors of addition, mistranslation, omission, or untranslated text),
(ii) fluency (by applying ${targetLang} grammar, spelling and punctuation rules and ensuring there are no unnecessary repetitions),
(iii) style (by ensuring the translations reflect the style of the source text)
(iv) terminology (inappropriate for context, inconsistent use), or
(v) other errors.

Output only the new translation of the indicated part and nothing else.`;

  const translation2Chunks = [];
  for (let i = 0; i < sourceTextChunks.length; i++) {
    const taggedText = sourceTextChunks.slice(0, i).join('') +
      "<TRANSLATE_THIS>" + sourceTextChunks[i] + "</TRANSLATE_THIS>" +
      sourceTextChunks.slice(i + 1).join('');

    const prompt = improvementPrompt
      .replace('{tagged_text}', taggedText)
      .replace('{chunk_to_translate}', sourceTextChunks[i])
      .replace('{translation_1_chunk}', translation1Chunks[i])
      .replace('{reflection_chunk}', reflectionChunks[i]);

    const translation2 = await getCompletion(prompt, systemMessage);
    translation2Chunks.push(translation2);
  }

  return translation2Chunks;
}

async function multichunkTranslation(sourceLang, targetLang, sourceTextChunks, country = "") {
  const translation1Chunks = await multichunkInitialTranslation(sourceLang, targetLang, sourceTextChunks);
  const reflectionChunks = await multichunkReflectOnTranslation(sourceLang, targetLang, sourceTextChunks, translation1Chunks, country);
  const translation2Chunks = await multichunkImproveTranslation(sourceLang, targetLang, sourceTextChunks, translation1Chunks, reflectionChunks);
  return translation2Chunks;
}

export async function translate(sourceLang, targetLang, sourceText, country, maxTokens = MAX_TOKENS_PER_CHUNK) {
  try {
    console.log(`Starting translation from ${sourceLang} to ${targetLang}`);
    console.log(`Country context: ${country}`);
    console.log(`Max tokens per chunk: ${maxTokens}`);

    const numTokensInText = numTokensInString(sourceText);
    console.log(`Total tokens in source text: ${numTokensInText}`);

    let translation;

    if (numTokensInText <= maxTokens) {
      console.log("Translating text as a single chunk");
      translation = await oneChunkTranslateText(sourceLang, targetLang, sourceText, country);
    } else {
      console.log("Translating text as multiple chunks");
      const tokenSize = calculateChunkSize(numTokensInText, maxTokens);
      console.log(`Calculated chunk size: ${tokenSize} tokens`);
      
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: tokenSize,
        chunkOverlap: 0,
      });

      const sourceTextChunks = await textSplitter.splitText(sourceText);
      console.log(`Text split into ${sourceTextChunks.length} chunks`);

      const translationChunks = await multichunkTranslation(sourceLang, targetLang, sourceTextChunks, country);
      translation = translationChunks.join('');
    }

    console.log("Translation completed successfully");
    return translation;
  } catch (error) {
    console.error("Error in translation process:", error);
    throw new Error(`Translation failed: ${error.message}`);
  }
}