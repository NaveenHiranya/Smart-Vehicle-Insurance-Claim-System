import fs from 'fs';
import path from 'path';
import { getGeminiModel } from '../utils/gemini.js';
import prisma from '../utils/prisma.js';
import { DocumentVerificationResult } from '../types/index.js';

const DOCUMENT_VERIFICATION_PROMPT = `You are an expert document verification AI for insurance claims. Analyze the provided document image and verify its authenticity and completeness.

Check for the following:
1. **Readability**: Is the document clear and legible? Can text be read?
2. **Document Type Identification**: What type of document is this?
3. **Key Information Presence**:
   - For Driver's License: Full name, date of birth, license number, expiration date, photo
   - For Vehicle Registration: Vehicle make/model/year, VIN, owner name, registration date, expiration
   - For Accident Report: Date, location, parties involved, description of incident, officer name/badge number
   - For Repair Estimate: Shop name, itemized parts/labor, total cost, vehicle info, date
4. **Potential Issues**:
   - Blurry or unreadable sections
   - Expired documents
   - Missing required information
   - Signs of tampering or alteration
   - Inconsistencies in information

You MUST respond with ONLY a valid JSON object in this exact format:
{
  "status": "VERIFIED|ISSUES_FOUND|UNREADABLE",
  "issues": ["list of any issues found"],
  "extractedInfo": {
    "key": "value pairs of important information extracted from the document"
  },
  "recommendations": ["list of recommendations if issues are found"]
}

Status guidelines:
- VERIFIED: Document is clear, complete, and contains all required information
- ISSUES_FOUND: Document is readable but has issues (expired, missing info, etc.)
- UNREADABLE: Document is too blurry, dark, or damaged to assess

Respond ONLY with the JSON object, no additional text.`;

export async function verifyDocument(documentId: string): Promise<DocumentVerificationResult> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { claim: { include: { vehicle: true, user: true } } },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const filePath = path.resolve(uploadDir, document.filePath.replace(/^\/uploads\//, ''));

  if (!fs.existsSync(filePath)) {
    throw new Error('Document file not found on disk');
  }

  const model = getGeminiModel();

  const imageData = fs.readFileSync(filePath);
  const mimeType = path.extname(filePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';

  const context = `Document type submitted as: ${document.type}.
Claim context: Vehicle is a ${document.claim.vehicle.year} ${document.claim.vehicle.make} ${document.claim.vehicle.model}.
Policyholder name: ${document.claim.user.firstName} ${document.claim.user.lastName}.`;

  const result = await model.generateContent([
    `${DOCUMENT_VERIFICATION_PROMPT}\n\n${context}`,
    {
      inlineData: {
        data: imageData.toString('base64'),
        mimeType,
      },
    },
  ]);

  const responseText = result.response.text();

  let verificationResult: DocumentVerificationResult;
  try {
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```json?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    verificationResult = JSON.parse(jsonStr) as DocumentVerificationResult;
  } catch {
    console.error('Failed to parse verification response:', responseText);
    verificationResult = {
      status: 'UNREADABLE',
      issues: ['Automated verification failed. Manual review required.'],
      extractedInfo: {},
      recommendations: ['Please ensure the document image is clear and well-lit, then retry.'],
    };
  }

  // Update document record
  await prisma.document.update({
    where: { id: documentId },
    data: {
      verificationStatus: verificationResult.status as any,
      verificationResult: verificationResult as any,
    },
  });

  return verificationResult;
}
