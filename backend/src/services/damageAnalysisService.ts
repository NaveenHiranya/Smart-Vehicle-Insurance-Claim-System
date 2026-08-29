import fs from 'fs';
import path from 'path';
import { generateContentWithFallback } from '../utils/gemini.js';
import prisma from '../utils/prisma.js';
import { DamageAnalysisResult } from '../types/index.js';

const DAMAGE_ANALYSIS_PROMPT = `You are a vehicle damage assessor. Examine the images and list every visible damage: dents, scratches, cracks, broken lights, bumper/glass/wheel/panel/structural damage.

Respond with ONLY a valid JSON object in this exact format:
{
  "damages": [
    {
      "type": "dent|scratch|crack|broken_light|bumper_damage|glass_damage|panel_deformation|wheel_damage|structural_damage|other",
      "severity": "MINOR|MODERATE|SEVERE",
      "location": "short position, e.g. front-left bumper",
      "description": "one short sentence"
    }
  ],
  "drivabilityAssessment": "one short sentence on safety to drive",
  "overallSeverity": "MINOR|MODERATE|SEVERE"
}

Severity: MINOR = cosmetic only; MODERATE = functional damage, likely drivable; SEVERE = safety-critical or structural.
No visible damage: empty damages array, overallSeverity "MINOR". No other text.`;

export async function analyzeDamage(claimId: string): Promise<DamageAnalysisResult> {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { images: true, vehicle: true },
  });

  if (!claim) {
    throw new Error('Claim not found');
  }

  if (claim.images.length === 0) {
    throw new Error('No images to analyze');
  }

  // Image tokens dominate the cost of each analysis — cap how many are sent.
  // Damage close-ups carry the damage detail, so they are prioritized; full-vehicle
  // shots only fill the remaining slots (context/orientation).
  const MAX_AI_IMAGES = 6;
  const closeups = claim.images.filter((img) => img.type === 'DAMAGE_CLOSEUP');
  const fulls = claim.images.filter((img) => img.type !== 'DAMAGE_CLOSEUP');
  const selectedImages = [...closeups, ...fulls].slice(0, MAX_AI_IMAGES);

  // Prepare image data for Gemini
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const imageParts = selectedImages.map((img: { filePath: string }) => {
    const filePath = path.resolve(uploadDir, img.filePath.replace(/^\/uploads\//, ''));
    const imageData = fs.readFileSync(filePath);
    const mimeType = path.extname(filePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    return {
      inlineData: {
        data: imageData.toString('base64'),
        mimeType,
      },
    };
  });

  const vehicleContext = `Vehicle: ${claim.vehicle.year} ${claim.vehicle.make} ${claim.vehicle.model}, Color: ${claim.vehicle.color}`;
  const fullPrompt = `${DAMAGE_ANALYSIS_PROMPT}\n\n${vehicleContext}`;

  // JSON response mode: guarantees a compact JSON payload with no prose/markdown
  // wrapper — fewer output tokens, faster and cheaper.
  const { text: responseText, modelUsed } = await generateContentWithFallback([fullPrompt, ...imageParts], {
    responseMimeType: 'application/json',
  });
  console.log(`[damageAnalysis] Used model: ${modelUsed}, images: ${imageParts.length}/${claim.images.length}`);

  // Parse the JSON response
  let analysisResult: DamageAnalysisResult;
  try {
    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```json?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    analysisResult = JSON.parse(jsonStr) as DamageAnalysisResult;
  } catch {
    console.error('Failed to parse Gemini response:', responseText);
    // Fallback result
    analysisResult = {
      damages: [],
      drivabilityAssessment: 'Unable to complete automated assessment. Manual review required.',
      overallSeverity: 'MINOR',
    };
  }

  // Save or update damage assessment
  const existingAssessment = await prisma.damageAssessment.findUnique({
    where: { claimId },
  });

  const assessmentData = {
    damages: analysisResult.damages as any,
    drivabilityAssessment: analysisResult.drivabilityAssessment,
    overallSeverity: analysisResult.overallSeverity as any,
    aiRawResponse: responseText as any,
  };

  let assessment;
  if (existingAssessment) {
    assessment = await prisma.damageAssessment.update({
      where: { claimId },
      data: assessmentData,
    });
  } else {
    assessment = await prisma.damageAssessment.create({
      data: {
        claimId,
        ...assessmentData,
      },
    });
  }

  // Update AI annotations on images
  for (const img of claim.images) {
    await prisma.claimImage.update({
      where: { id: img.id },
      data: {
        aiAnnotation: analysisResult.damages.filter(
          (d) => d.location.toLowerCase().includes(img.type === 'DAMAGE_CLOSEUP' ? 'close' : 'full')
        ) as any,
      },
    });
  }

  // Auto-generate repair estimate after damage analysis
  try {
    const { generateRepairEstimate } = await import('./repairEstimateService.js');
    await generateRepairEstimate(claimId);
  } catch (err) {
    console.error('Auto repair estimate generation failed:', err);
  }

  return analysisResult;
}
