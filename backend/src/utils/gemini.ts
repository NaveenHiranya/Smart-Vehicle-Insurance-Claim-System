import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

export const getGeminiModel = (modelName: string = 'gemini-2.5-flash') => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  return genAI.getGenerativeModel({ model: modelName });
};

export default new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
