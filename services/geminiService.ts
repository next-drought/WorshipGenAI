import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set the API_KEY environment variable.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to clean JSON output from LLM
const cleanJson = (text: string): string => {
  if (!text) return '{}';
  let clean = text.trim();
  // Remove markdown code blocks
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
  }
  return clean.trim();
};

// Prompt templates
const NARRATIVE_PROMPT = `
You are a skilled theologian and writer. 
Transform the following sermon slide content into a flowing, coherent sermon narrative (manuscript).
The output must be in Traditional Chinese (繁體中文) or Simplified Chinese based on the input.
Maintain the theological accuracy, scripture references, and a pastoral tone.
Expand bullet points into full sentences that flow naturally.
Do not add your own doctrine, only expand on what is provided.
`;

const TRANSLATION_PROMPT = `
You are a professional translator specializing in theological and liturgical texts.
Translate the provided content between Chinese and English.
If the input is Chinese, translate to English. If English, to Chinese.
Preserve theological nuance (e.g., "Grace", "Salvation", "Trinity").
Maintain the original formatting structure.
Output ONLY the translation.
`;

const BULLETIN_PARSE_PROMPT = `
Extract the following information from the Worship Bulletin text provided below.
Return the output as a valid JSON object with the following keys:
- "date": string (YYYY-MM-DD format if possible)
- "orderOfService": array of strings (the items in the service)
- "hymns": array of strings (titles and numbers)
- "scripture": string (main passage reference)
- "prayerFocus": string (CRITICAL: Extract the FULL CONTENT of the weekly prayer items/intercession. Look for sections titled 'Prayer Items', '代禱事項', '公禱', 'Weekly Prayer', etc. Capture ALL bullet points, specific prayer requests, names, and ministries listed. Do not just capture the title; capture the details.)
- "announcements": array of strings
- "sermonTitle": string (if found)
- "preacher": string (if found)

If information is missing, use empty strings or arrays. Do not hallucinate data.
`;

const ASSEMBLY_PROMPT = `
You are a Worship Program Assembler.
Create a comprehensive bilingual worship program using the provided component parts.
The output must be in Markdown format.

Structure:
# Worship Program [Date]
## Order of Service / 程序
[Table or Parallel List of Service Items]

## Weekly Prayer / 代禱事項
[Bilingual Prayer Focus Content. Translate the 'prayerFocus' data. Format as interleaved text: English paragraph/bullet first, followed immediately by the corresponding Chinese paragraph/bullet. Do not separate languages into large distinct blocks.]

## Sermon / 講道
Title: [Bilingual Title]
Preacher: [Name]

Scripture: [Reference]

[Bilingual Sermon Content - Interleave paragraphs: English first, then Chinese.]

## Announcements / 報告
[Bilingual Announcements - English item followed by Chinese item]

Ensure the layout is clean, readable, and professional.
`;

export const parseBulletin = async (text: string): Promise<any> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `${BULLETIN_PARSE_PROMPT}\n\n--- BULLETIN TEXT ---\n${text}`,
    config: {
      responseMimeType: 'application/json'
    }
  });
  
  try {
    const rawText = response.text || '{}';
    const jsonStr = cleanJson(rawText);
    console.log("Parsed Bulletin JSON String:", jsonStr); // For debugging
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("JSON Parse error in bulletin", e);
    // Return a partial object to allow flow to continue
    return { 
      date: "", 
      orderOfService: [], 
      hymns: [], 
      scripture: "", 
      prayerFocus: "Prayer content could not be automatically extracted.", 
      announcements: [] 
    };
  }
};

export const generateNarrativeFromSlides = async (slideText: string): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `${NARRATIVE_PROMPT}\n\n--- SLIDE CONTENT ---\n${slideText}`,
  });
  return response.text || '';
};

export const translateText = async (text: string, targetLang: 'en' | 'zh'): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `${TRANSLATION_PROMPT}\nTarget Language: ${targetLang === 'en' ? 'English' : 'Traditional Chinese'}\n\n--- CONTENT ---\n${text}`,
  });
  return response.text || '';
};

export const assembleProgram = async (
  bulletinData: any,
  sermonTextOriginal: string,
  sermonTextTranslated: string
): Promise<string> => {
  const ai = getClient();
  
  // Set a safe limit for content context to avoid errors or model degradation.
  // 30000 chars is approx 5k-8k tokens, which is plenty for sermon manuscripts.
  const limit = 30000; 

  const prompt = `
  ${ASSEMBLY_PROMPT}

  Input Data:
  1. Bulletin JSON: ${JSON.stringify(bulletinData)}
  2. Original Sermon (Source): ${sermonTextOriginal ? sermonTextOriginal.substring(0, limit) : '[No original sermon text provided]'}
  3. Translated Sermon (Target): ${sermonTextTranslated ? sermonTextTranslated.substring(0, limit) : '[No translated sermon text provided]'}
  
  Please output the full structured Markdown.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  
  return response.text || '';
};