import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Model cascade ordered by measured performance on image + structured-JSON tasks
// (probed against the live API, Aug 2026): 3.1-flash-lite ~2.6s and highest rate
// limits, 3.5-flash-lite ~4s, 3.5-flash ~3s with thinking disabled. The older
// 2.5 models are kept as last resort — they still work but run far slower.
// Per-model options: thinkingBudget 0 turns off "thinking" tokens, which is much
// faster for structured extraction — but only some models accept the parameter
// (e.g. gemini-3.6-flash rejects it with a 400), so it is applied per entry.
interface CascadeModel {
  name: string;
  thinkingBudget?: number;
}

const BASE_CASCADE: CascadeModel[] = [
  { name: 'gemini-3.1-flash-lite' },               // fastest, 15 RPM / 500 RPD
  { name: 'gemini-3.5-flash-lite' },
  { name: 'gemini-3.5-flash', thinkingBudget: 0 }, // stronger model, thinking off for speed
  { name: 'gemini-3.6-flash' },                    // does NOT accept thinkingBudget
  { name: 'gemini-2.5-flash-lite' },
  { name: 'gemini-2.5-flash' },
];

// GEMINI_MODEL moves a specific model to the front of the cascade (it still
// falls back to the rest if it fails).
const override = process.env.GEMINI_MODEL?.trim();
const MODEL_CASCADE: CascadeModel[] = override
  ? [{ name: override }, ...BASE_CASCADE.filter((m) => m.name !== override)]
  : BASE_CASCADE;

const MAX_RETRIES_PER_MODEL = 0;
const RETRY_DELAY_MS = 500;
const ATTEMPT_TIMEOUT_MS = 30_000;

function getModel(modelName: string): GenerativeModel {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  return genAI.getGenerativeModel({ model: modelName });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Model call timed out after ${ms}ms`)), ms)
    ),
  ]);
}

type FailureKind = 'retry' | 'next-model' | 'fatal';

/**
 * retry       — transient (429/500/503/timeout): same model may recover
 * next-model  — model-specific incompatibility (400/404 e.g. unsupported
 *               thinkingConfig or a retired model): only another model can help
 * fatal       — auth problems (401/403): no model will work, fail immediately
 */
function classifyError(err: any): FailureKind {
  const status = err?.status ?? err?.code ?? 0;
  const msg = (err?.message || '').toLowerCase();
  if (status === 429 || status === 500 || status === 503 || msg.includes('timed out')) return 'retry';
  if (status === 401 || status === 403) return 'fatal';
  if (
    msg.includes('overloaded') ||
    msg.includes('unavailable') ||
    msg.includes('quota') ||
    msg.includes('rate') ||
    msg.includes('too many')
  ) {
    return 'retry';
  }
  if (status === 400 || status === 404) return 'next-model';
  return 'next-model'; // unknown error — give another model a chance before giving up
}

/**
 * Sends one user turn (mixed text and image parts) through the model cascade.
 * generationConfig is optional and may carry responseMimeType/responseSchema for
 * structured JSON output.
 *
 * The request body must use full Content objects — contents: [{ role, parts }].
 * (Passing bare parts under contents is silently accepted by neither the API
 * nor the SDK and results in a 400 Bad Request.)
 */
export async function generateContentWithFallback(
  content: (string | Part)[],
  generationConfig: Record<string, unknown> = {}
): Promise<{ text: string; modelUsed: string }> {
  for (let m = 0; m < MODEL_CASCADE.length; m++) {
    const entry = MODEL_CASCADE[m];
    const model = getModel(entry.name);
    const config =
      entry.thinkingBudget !== undefined
        ? { ...generationConfig, thinkingConfig: { thinkingBudget: entry.thinkingBudget } }
        : generationConfig;

    for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        // Bare strings in the input are shorthand — the API needs { text } parts
        const parts: Part[] = content.map((p) => (typeof p === 'string' ? { text: p } : p));
        const result = await withTimeout(
          model.generateContent({
            contents: [{ role: 'user', parts }],
            generationConfig: config,
          }),
          ATTEMPT_TIMEOUT_MS
        );
        const text = result.response.text();
        if (m > 0) console.log(`[gemini] Request served by fallback model: ${entry.name}`);
        return { text, modelUsed: entry.name };
      } catch (err: any) {
        const kind = classifyError(err);
        const isLastModel = m === MODEL_CASCADE.length - 1;
        const lastAttempt = attempt === MAX_RETRIES_PER_MODEL;

        if (kind === 'fatal' || (isLastModel && lastAttempt)) {
          console.error(`[gemini] All models failed. Last error from ${entry.name}:`, err?.message);
          throw err;
        }
        if (kind === 'retry' && !lastAttempt) {
          const delay = RETRY_DELAY_MS * (attempt + 1);
          console.warn(
            `[gemini] ${entry.name} attempt ${attempt + 1} failed (${err?.message?.slice(0, 80)}). Retrying in ${delay}ms...`
          );
          await sleep(delay);
          continue;
        }
        console.warn(
          `[gemini] ${entry.name} failed (${err?.message?.slice(0, 80)}). Trying next model...`
        );
        break; // move to the next model
      }
    }
  }
  throw new Error('All Gemini models failed');
}

/**
 * Starts a chat session with cascade fallback: if a model fails to initialize,
 * the next one is tried. Used for multi-turn conversations.
 */
export async function startChatWithFallback(
  history: any[]
): Promise<{ sendMessage: (msg: string) => Promise<any>; modelUsed: string }> {
  for (let m = 0; m < MODEL_CASCADE.length; m++) {
    const entry = MODEL_CASCADE[m];
    try {
      const chat = getModel(entry.name).startChat({ history });
      if (m > 0) console.log(`[gemini] Chat served by fallback model: ${entry.name}`);
      return {
        sendMessage: async (msg: string) => {
          for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
            try {
              return await withTimeout(chat.sendMessage(msg), ATTEMPT_TIMEOUT_MS);
            } catch (err: any) {
              const kind = classifyError(err);
              if (kind !== 'retry' || attempt === MAX_RETRIES_PER_MODEL) throw err;
              await sleep(RETRY_DELAY_MS * (attempt + 1));
            }
          }
          throw new Error('Chat message failed');
        },
        modelUsed: entry.name,
      };
    } catch (err: any) {
      const kind = classifyError(err);
      const isLast = m === MODEL_CASCADE.length - 1;
      if (kind === 'fatal' || isLast) {
        console.error(`[gemini] All chat models failed. Last error from ${entry.name}:`, err?.message);
        throw err;
      }
      console.warn(`[gemini] Chat model ${entry.name} failed (${err?.message?.slice(0, 80)}). Trying next...`);
    }
  }
  throw new Error('All Gemini chat models failed');
}
