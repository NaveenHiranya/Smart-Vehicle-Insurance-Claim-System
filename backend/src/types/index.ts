import { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
}

// Vehicle classes recognized across the system — the AI fills this at
// registration and the repair estimate scales its pricing by class
export const VEHICLE_TYPES = [
  'CAR', 'SUV_PICKUP', 'VAN', 'LORRY_TRUCK', 'BUS',
  'MOTORCYCLE', 'THREE_WHEELER', 'TRACTOR', 'OTHER',
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface DamageItem {
  type: string;
  severity: 'MINOR' | 'MODERATE' | 'SEVERE';
  location: string;
  description: string;
  affectedParts?: string[];
}

export interface DamageAnalysisResult {
  damages: DamageItem[];
  drivabilityAssessment: string;
  overallSeverity: 'MINOR' | 'MODERATE' | 'SEVERE';
}

export interface RepairEstimateItem {
  damageType: string;
  partName: string;
  partCost: number;
  laborHours: number;
  laborRate: number;
  laborCost: number;
  paintMaterials: number;
  subtotal: number;
}

export interface RepairEstimateResult {
  items: RepairEstimateItem[];
  totalPartsCost: number;
  totalLaborCost: number;
  totalCost: number;
  estimatedDays: number;
}

export interface DocumentVerificationResult {
  status: 'VERIFIED' | 'ISSUES_FOUND' | 'UNREADABLE';
  issues: string[];
  extractedInfo: Record<string, string>;
  recommendations: string[];
}
