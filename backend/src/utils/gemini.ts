import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Model cascade: tried in order. First model with highest rate limits is primary.
const MODEL_CASCADE = [
  'gemini-3.1-flash-lite',   // 15 RPM, 500 RPD — highest limits
  'gemini-2.5-flash',        // 5 RPM, 20 RPD — best quality
  'gemini-3-flash',          // 5 RPM, 20 RPD
  'gemini-3.7-flash',        // 5 RPM, 20 RPD
  'gemini-2.5-flash-lite',   // 10 RPM, 20 RPD
];

const MAX_RETRIES_PER_MODEL = 1;
const RETRY_DELAY_MS = 1000;

function getModel(modelName: string): GenerativeModel {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  return genAI.getGenerativeModel({ model: modelName });
}

export const getGeminiModel = (modelName: string = 'gemini-3.1-flash-lite') => {
  return getModel(modelName);
};

function isRetryable(err: any): boolean {
  const msg = (err?.message || '').toLowerCase();
  const status = err?.status || err?.code || 0;
  return (
    status === 429 ||
    status === 503 ||
    status === 500 ||
    msg.includes('overloaded') ||
    msg.includes('unavailable') ||
    msg.includes('internal') ||
    msg.includes('rate') ||
    msg.includes('quota') ||
    msg.includes('too many')
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Tries each model in MODEL_CASCADE order.
 * Retries once per model on retryable errors (429/503/500) with backoff.
 * Returns the response text and which model was actually used.
 */
export async function generateContentWithFallback(
  content: any[]
): Promise<{ text: string; modelUsed: string }> {
  for (const modelName of MODEL_CASCADE) {
    const model = getModel(modelName);
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        const result = await model.generateContent(content);
        const text = result.response.text();
        if (modelName !== MODEL_CASCADE[0]) {
          console.log(`[gemini] Fallback used model: ${modelName}`);
        }
        return { text, modelUsed: modelName };
      } catch (err: any) {
        const isLast =
          modelName === MODEL_CASCADE[MODEL_CASCADE.length - 1] &&
          attempt === MAX_RETRIES_PER_MODEL;
        if (!isRetryable(err) || isLast) {
          if (isLast) {
            console.error(
              `[gemini] All models exhausted. Last error from ${modelName}:`,
              err?.message
            );
            throw err;
          }
          throw err; // non-retryable — fail immediately
        }
        const delay = RETRY_DELAY_MS * (attempt + 1);
        console.warn(
          `[gemini] ${modelName} attempt ${attempt + 1} failed (${err?.message?.slice(0, 80)}). ` +
            (attempt < MAX_RETRIES_PER_MODEL
              ? `Retrying in ${delay}ms...`
              : 'Trying next model...')
        );
        if (attempt < MAX_RETRIES_PER_MODEL) await sleep(delay);
      }
    }
  }
  throw new Error('All Gemini models failed');
}

/**
 * Starts a chat session with cascade fallback.
 * If the primary model fails to initialize or send, falls back to the next.
 */
export async function startChatWithFallback(
  history: any[]
): Promise<{ sendMessage: (msg: string) => Promise<any>; modelUsed: string }> {
  for (const modelName of MODEL_CASCADE) {
    const model = getModel(modelName);
    try {
      const chat = model.startChat({ history });
      if (modelName !== MODEL_CASCADE[0]) {
        console.log(`[gemini] Chat fallback used model: ${modelName}`);
      }
      return {
        sendMessage: async (msg: string) => {
          for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
            try {
              return await chat.sendMessage(msg);
            } catch (err: any) {
              if (!isRetryable(err) || attempt === MAX_RETRIES_PER_MODEL)
                throw err;
              await sleep(RETRY_DELAY_MS * (attempt + 1));
            }
          }
        },
        modelUsed: modelName,
      };
    } catch (err: any) {
      const isLast = modelName === MODEL_CASCADE[MODEL_CASCADE.length - 1];
      if (!isRetryable(err) || isLast) {
        if (isLast) {
          console.error(
            `[gemini] All chat models exhausted. Last error from ${modelName}:`,
            err?.message
          );
          throw err;
        }
        throw err; // non-retryable
      }
      console.warn(
        `[gemini] Chat model ${modelName} failed (${err?.message?.slice(0, 80)}). Trying next...`
      );
    }
  }
  throw new Error('All Gemini chat models failed');
}

export default new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
