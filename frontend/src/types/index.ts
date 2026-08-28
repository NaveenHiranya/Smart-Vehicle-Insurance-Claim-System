export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  isAdmin?: boolean;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  licensePlate: string;
  color: string;
  mileage?: number;
  photos: string[];
  createdAt: string;
  _count?: { claims: number };
  claims?: Claim[];
}

export interface InsurancePolicy {
  id: string;
  userId: string;
  providerName: string;
  policyNumber: string;
  coverageType: string;
  deductible: number;
  premiumAmount: number;
  startDate: string;
  endDate: string;
}

export type ClaimStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'GARAGE_REVIEW' | 'GARAGE_ESTIMATED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export type ImageType = 'FULL_VEHICLE' | 'DAMAGE_CLOSEUP';
export type SeverityLevel = 'MINOR' | 'MODERATE' | 'SEVERE';
export type DocumentType = 'LICENSE' | 'REGISTRATION' | 'ACCIDENT_REPORT' | 'REPAIR_ESTIMATE';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'ISSUES_FOUND' | 'UNREADABLE';

export interface ClaimImage {
  id: string;
  claimId: string;
  type: ImageType;
  filePath: string;
  label?: string;
  aiAnnotation?: any;
  uploadedAt: string;
}

export interface DamageItem {
  type: string;
  severity: SeverityLevel;
  location: string;
  description: string;
  affectedParts: string[];
}

export interface DamageAssessment {
  id: string;
  claimId: string;
  damages: DamageItem[];
  drivabilityAssessment: string;
  overallSeverity: SeverityLevel;
  aiRawResponse?: any;
  assessedAt: string;
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

export interface RepairEstimate {
  id: string;
  claimId: string;
  items: RepairEstimateItem[];
  totalPartsCost: number;
  totalLaborCost: number;
  totalCost: number;
  estimatedDays: number;
}

export interface InsurancePayout {
  id: string;
  claimId: string;
  deductible: number;
  coveredAmount: number;
  estimatedPayout: number;
  notes?: string;
}

export interface Document {
  id: string;
  claimId: string;
  type: DocumentType;
  filePath: string;
  verificationStatus: VerificationStatus;
  verificationResult?: any;
  uploadedAt: string;
}

export interface ChatMessage {
  id: string;
  claimId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

export interface AdminNote {
  id: string;
  claimId: string;
  category: 'vehicle' | 'document' | 'general';
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Garage {
  id: string;
  email: string;
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  city: string;
  licenseNumber: string;
  specialties: string;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
  _count?: { claims: number; garageEstimates: number };
}

export interface GarageEstimateItem {
  damageType: string;
  partName: string;
  partCost: number;
  laborHours: number;
  laborRate: number;
  laborCost: number;
  paintMaterials: number;
  subtotal: number;
  addedByGarage?: boolean;
}

export interface GarageEstimate {
  id: string;
  claimId: string;
  garageId: string;
  items: GarageEstimateItem[];
  totalPartsCost: number;
  totalLaborCost: number;
  totalCost: number;
  estimatedDays: number;
  notes?: string;
  submittedAt: string;
  updatedAt: string;
}

export interface Claim {
  id: string;
  userId: string;
  vehicleId: string;
  policyId?: string;
  status: ClaimStatus;
  incidentDate: string;
  incidentLocation: string;
  incidentDescription: string;
  weatherConditions?: string;
  hasPoliceReport: boolean;
  createdAt: string;
  updatedAt: string;
  vehicle: Vehicle;
  policy?: InsurancePolicy;
  garage?: { id: string; name: string; ownerName?: string; phone: string; address: string; city: string; licenseNumber?: string };
  images: ClaimImage[];
  damageAssessment?: DamageAssessment;
  repairEstimate?: RepairEstimate;
  garageEstimate?: GarageEstimate;
  insurancePayout?: InsurancePayout;
  documents: Document[];
  chatMessages: ChatMessage[];
  adminNotes?: AdminNote[];
  _count?: { images: number; documents: number };
}

export interface AuthResponse {
  user: User;
  token: string;
}
