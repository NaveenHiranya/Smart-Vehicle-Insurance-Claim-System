import fs from 'fs';
import path from 'path';
import { getGeminiModel } from '../utils/gemini.js';
import prisma from '../utils/prisma.js';
import { DamageAnalysisResult } from '../types/index.js';

const DAMAGE_ANALYSIS_PROMPT = `You are an expert automotive damage assessment AI. Analyze the provided vehicle images and identify any visible damage.

For each image, carefully examine:
- Dents, dings, and panel deformation
- Scratches and paint damage
- Cracks (glass, plastic, body panels)
- Broken or damaged lights (headlights, taillights, indicators)
- Bumper damage (cracks, misalignment, detachment)
- Glass/windshield damage
- Wheel/tire damage
- Frame or structural damage
- Any other collision-related defects

For FULL VEHICLE photos, also assess:
- Overall vehicle condition
- General drivability assessment
- Visible damage regions described as positions on the vehicle (front-left, rear-right, etc.)

For DAMAGE CLOSEUP photos, provide detailed analysis of each specific damage area.

You MUST respond with ONLY a valid JSON object in this exact format:
{
  "damages": [
    {
      "type": "dent|scratch|crack|broken_light|bumper_damage|glass_damage|panel_deformation|wheel_damage|structural_damage|other",
      "severity": "MINOR|MODERATE|SEVERE",
      "location": "Description of where on the vehicle (e.g., front-left bumper, rear-right quarter panel)",
      "description": "Detailed description of the damage",
      "affectedParts": ["part1", "part2"]
    }
  ],
  "drivabilityAssessment": "Assessment of whether the vehicle is safe to drive and any safety concerns",
  "overallSeverity": "MINOR|MODERATE|SEVERE"
}

Severity guidelines:
- MINOR: Cosmetic damage only, no safety concerns (small scratches, minor dents, small paint chips)
- MODERATE: Functional damage that may affect operation but vehicle is likely drivable (dented panels, cracked bumper, damaged lights)
- SEVERE: Safety-critical damage or major structural issues (frame damage, shattered glass, deployed airbags, wheel damage, severe body damage)

If no damage is visible, return an empty damages array and set overallSeverity to "MINOR".
Respond ONLY with the JSON object, no additional text.`;

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

  const model = getGeminiModel();

  // Prepare image data for Gemini
  const imageParts = claim.images.map((img) => {
    const filePath = path.resolve('.', img.filePath.replace('/uploads/', 'uploads/'));
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

  const result = await model.generateContent([fullPrompt, ...imageParts]);
  const responseText = result.response.text();

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
