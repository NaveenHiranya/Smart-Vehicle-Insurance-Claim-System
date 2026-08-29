import { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
}

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
