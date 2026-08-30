import { generateContentWithFallback } from '../utils/gemini.js';
import { loadImagePart, resolveUploadPath } from '../utils/imageUtils.js';
import { VEHICLE_TYPES, type VehicleType } from '../types/index.js';

export interface VehicleDetectionResult {
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  // Chassis number read from the vehicle book (CR book) — stored as the vehicle's VIN
  chassisNumber: string;
  vehicleType: VehicleType;
  confidence: string;
  additionalInfo?: string;
}

export type DetectionSource = 'photo' | 'book';

// Enforced by the API — the model cannot respond with anything but this shape
const DETECTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    make: { type: 'STRING' },
    model: { type: 'STRING' },
    year: { type: 'INTEGER' },
    color: { type: 'STRING' },
    licensePlate: { type: 'STRING' },
    chassisNumber: { type: 'STRING' },
    vehicleType: { type: 'STRING', enum: [...VEHICLE_TYPES] },
    confidence: { type: 'STRING', enum: ['HIGH', 'MEDIUM', 'LOW'] },
    additionalInfo: { type: 'STRING' },
  },
  required: ['make', 'model', 'year', 'color', 'licensePlate', 'vehicleType', 'confidence', 'additionalInfo'],
};

const VEHICLE_DETECTION_PROMPT = `Identify the vehicle in this photo (make, model, approximate year, paint color) and read the license plate if visible. Leave chassisNumber empty unless it is printed on the vehicle. Also classify the vehicle type exactly: CAR (hatchback/sedan/coupe), SUV_PICKUP (SUV/crossover/pickup), VAN (minivan/KDH-type), LORRY_TRUCK (lorry/truck), BUS (bus/coach), MOTORCYCLE (motorcycle/scooter/moped), THREE_WHEELER (three-wheeler/tuk-tuk), TRACTOR (tractor), or OTHER (anything else). Judge your confidence: HIGH when clearly identifiable, MEDIUM when partially obscured, LOW when unclear or not a vehicle. Use "Unknown" for anything you cannot determine, and the current year when the year is a guess.`;

const BOOK_DETECTION_PROMPT = `This is a photo of a vehicle registration document — a vehicle book (CR book / certificate of registration). Read the registered details and extract: the make, the model, the year of manufacture, the color, the registration number (put this in licensePlate, exactly as printed), and the chassis number (put this in chassisNumber, exactly as printed — it is often labelled "Chassis No"). Also classify the vehicle type exactly: CAR (hatchback/sedan/coupe), SUV_PICKUP (SUV/crossover/pickup), VAN (minivan/KDH-type), LORRY_TRUCK (lorry/truck), BUS (bus/coach), MOTORCYCLE (motorcycle/scooter/moped), THREE_WHEELER (three-wheeler/tuk-tuk), TRACTOR (tractor), or OTHER (anything else). Judge your confidence: HIGH when the printed entries are clearly legible, MEDIUM when partially readable, LOW when the document is unclear or not a vehicle registration document. Use "Unknown" for anything you cannot determine, and the current year when the year is a guess. In additionalInfo, briefly list any other useful printed entries you can read (e.g. engine number, fuel type, engine capacity, registered date).`;

function normalizeDetection(parsed: Record<string, unknown>): VehicleDetectionResult {
  const confidence = String(parsed.confidence ?? '').trim().toUpperCase();
  const year = Number(parsed.year);
  const currentYear = new Date().getFullYear();
  const rawType = String(parsed.vehicleType ?? '').trim().toUpperCase();
  const rawChassis = String(parsed.chassisNumber ?? '').trim();
  return {
    make: String(parsed.make ?? '').trim() || 'Unknown',
    model: String(parsed.model ?? '').trim() || 'Unknown',
    year: Number.isInteger(year) && year >= 1900 && year <= currentYear + 1 ? year : currentYear,
    color: String(parsed.color ?? '').trim() || 'Unknown',
    licensePlate: String(parsed.licensePlate ?? '').trim(),
    // "Unknown"/placeholder readings must not overwrite a hand-typed chassis number
    chassisNumber: rawChassis && !/^unknown$/i.test(rawChassis) ? rawChassis : '',
    vehicleType: (VEHICLE_TYPES as readonly string[]).includes(rawType) ? (rawType as VehicleType) : 'OTHER',
    confidence: ['HIGH', 'MEDIUM', 'LOW'].includes(confidence) ? confidence : 'LOW',
    additionalInfo: String(parsed.additionalInfo ?? '').trim() || undefined,
  };
}

export async function detectVehicleFromImage(imagePath: string, source: DetectionSource = 'photo'): Promise<VehicleDetectionResult> {
  // imagePath comes in as e.g. /uploads/images/uuid.jpeg, resolved against
  // UPLOAD_DIR so it works in both dev (./uploads) and prod (/data/uploads).
  const fullPath = resolveUploadPath(imagePath);

  // Resized before upload — phone photos can exceed the API payload limit
  const imagePart = await loadImagePart(fullPath);
  if (!imagePart) {
    throw new Error(`Image file not found or unreadable at path: ${fullPath}`);
  }

  const prompt = source === 'book' ? BOOK_DETECTION_PROMPT : VEHICLE_DETECTION_PROMPT;

  const { text: responseText } = await generateContentWithFallback(
    [prompt, imagePart],
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
      chassisNumber: '',
      vehicleType: 'OTHER',
      confidence: 'LOW',
      additionalInfo: 'AI could not parse vehicle details from this image. Please fill in manually.',
    };
  }
}
