import { generateContentWithFallback } from '../utils/gemini.js';
import { loadImagePart, resolveUploadPath } from '../utils/imageUtils.js';
import { VEHICLE_TYPES, type VehicleType } from '../types/index.js';

export interface VehicleDetectionResult {
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  vehicleType: VehicleType;
  confidence: string;
  additionalInfo?: string;
}

// Enforced by the API — the model cannot respond with anything but this shape
const DETECTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    make: { type: 'STRING' },
    model: { type: 'STRING' },
    year: { type: 'INTEGER' },
    color: { type: 'STRING' },
    licensePlate: { type: 'STRING' },
    vehicleType: { type: 'STRING', enum: [...VEHICLE_TYPES] },
    confidence: { type: 'STRING', enum: ['HIGH', 'MEDIUM', 'LOW'] },
    additionalInfo: { type: 'STRING' },
  },
  required: ['make', 'model', 'year', 'color', 'licensePlate', 'vehicleType', 'confidence', 'additionalInfo'],
};

const VEHICLE_DETECTION_PROMPT = `Identify the vehicle in this photo (make, model, approximate year, paint color) and read the license plate if visible. Also classify the vehicle type exactly: CAR (hatchback/sedan/coupe), SUV_PICKUP (SUV/crossover/pickup), VAN (minivan/KDH-type), LORRY_TRUCK (lorry/truck), BUS (bus/coach), MOTORCYCLE (motorcycle/scooter/moped), THREE_WHEELER (three-wheeler/tuk-tuk), TRACTOR (tractor), or OTHER (anything else). Judge your confidence: HIGH when clearly identifiable, MEDIUM when partially obscured, LOW when unclear or not a vehicle. Use "Unknown" for anything you cannot determine, and the current year when the year is a guess.`;

function normalizeDetection(parsed: Record<string, unknown>): VehicleDetectionResult {
  const confidence = String(parsed.confidence ?? '').trim().toUpperCase();
  const year = Number(parsed.year);
  const currentYear = new Date().getFullYear();
  const rawType = String(parsed.vehicleType ?? '').trim().toUpperCase();
  return {
    make: String(parsed.make ?? '').trim() || 'Unknown',
    model: String(parsed.model ?? '').trim() || 'Unknown',
    year: Number.isInteger(year) && year >= 1900 && year <= currentYear + 1 ? year : currentYear,
    color: String(parsed.color ?? '').trim() || 'Unknown',
    licensePlate: String(parsed.licensePlate ?? '').trim(),
    vehicleType: (VEHICLE_TYPES as readonly string[]).includes(rawType) ? (rawType as VehicleType) : 'OTHER',
    confidence: ['HIGH', 'MEDIUM', 'LOW'].includes(confidence) ? confidence : 'LOW',
    additionalInfo: String(parsed.additionalInfo ?? '').trim() || undefined,
  };
}

export async function detectVehicleFromImage(imagePath: string): Promise<VehicleDetectionResult> {
  // imagePath comes in as e.g. /uploads/images/uuid.jpeg, resolved against
  // UPLOAD_DIR so it works in both dev (./uploads) and prod (/data/uploads).
  const fullPath = resolveUploadPath(imagePath);

  // Resized before upload — phone photos can exceed the API payload limit
  const imagePart = await loadImagePart(fullPath);
  if (!imagePart) {
    throw new Error(`Image file not found or unreadable at path: ${fullPath}`);
  }

  const { text: responseText } = await generateContentWithFallback(
    [VEHICLE_DETECTION_PROMPT, imagePart],
    {
      responseMimeType: 'application/json',
      responseSchema: DETECTION_SCHEMA,
      temperature: 0.1,
    }
  );

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('no JSON object in response');
    return normalizeDetection(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error('Failed to parse Gemini vehicle detection response:', responseText);
    return {
      make: 'Unknown',
      model: 'Unknown',
      year: new Date().getFullYear(),
      color: 'Unknown',
      licensePlate: '',
      vehicleType: 'OTHER',
      confidence: 'LOW',
      additionalInfo: 'AI could not parse vehicle details from this image. Please fill in manually.',
    };
  }
}
