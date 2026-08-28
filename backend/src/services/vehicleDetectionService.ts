import fs from 'fs';
import path from 'path';
import { getGeminiModel } from '../utils/gemini.js';

export interface VehicleDetectionResult {
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  confidence: string;
  additionalInfo?: string;
}

const VEHICLE_DETECTION_PROMPT = `You are an expert automotive identification AI. Analyze the provided vehicle image and identify the vehicle details as accurately as possible.

Carefully examine:
- The vehicle's exterior styling, body shape, and design cues
- Badge/emblem markings on the vehicle (grille, trunk, fenders)
- Headlight and taillight design
- Wheel design and size
- The vehicle's paint color
- Any visible license plate text
- The approximate model year based on generation/design cues

You MUST respond with ONLY a valid JSON object in this exact format:
{
  "make": "The vehicle manufacturer (e.g., Toyota, Honda, Ford, BMW)",
  "model": "The specific model (e.g., Camry, Civic, F-150, X5)",
  "year": The approximate model year as a 4-digit number,
  "color": "The exterior paint color (e.g., Pearl White, Midnight Black, Silver Metallic)",
  "licensePlate": "The license plate text exactly as visible in the image, or empty string if not readable",
  "confidence": "HIGH|MEDIUM|LOW - how confident you are in the identification",
  "additionalInfo": "Any extra observations (trim level, generation, body style, etc.) or empty string if none"
}

Guidelines:
- If the image clearly shows a recognizable vehicle, provide HIGH confidence
- If partially obscured but identifiable, provide MEDIUM confidence
- If the image is unclear, low quality, or not a vehicle, provide LOW confidence
- If you cannot identify the vehicle at all, set make to "Unknown", model to "Unknown", year to the current year, and confidence to "LOW"
- For color, be as specific as possible (e.g., "Metallic Gray" rather than just "Gray")

Respond ONLY with the JSON object, no additional text.`;

export async function detectVehicleFromImage(imagePath: string): Promise<VehicleDetectionResult> {
  // imagePath comes in as e.g. /uploads/images/uuid.jpeg
  // Resolve against UPLOAD_DIR so it works in both dev (./uploads) and prod (/data/uploads)
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const relativePart = imagePath.replace(/^\/uploads\//, '');
  const fullPath = path.resolve(uploadDir, relativePart);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Image file not found at path: ${fullPath}`);
  }

  const imageData = fs.readFileSync(fullPath);
  const ext = path.extname(fullPath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  const model = getGeminiModel();

  const result = await model.generateContent([
    VEHICLE_DETECTION_PROMPT,
    {
      inlineData: {
        data: imageData.toString('base64'),
        mimeType,
      },
    },
  ]);

  const responseText = result.response.text();

  let detection: VehicleDetectionResult;
  try {
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```json?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    detection = JSON.parse(jsonStr) as VehicleDetectionResult;
  } catch {
    console.error('Failed to parse Gemini vehicle detection response:', responseText);
    detection = {
      make: 'Unknown',
      model: 'Unknown',
      year: new Date().getFullYear(),
      color: 'Unknown',
      licensePlate: '',
      confidence: 'LOW',
      additionalInfo: 'AI could not parse vehicle details from this image. Please fill in manually.',
    };
  }

  return detection;
}
