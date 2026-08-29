export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  // Insurance company records filled in by an admin
  nic?: string;
  licenseType?: string;
  annualFee?: number;
  joinedAt?: string;
  isAdmin?: boolean;
  createdAt: string;
}

// User row as returned by the admin users endpoint (includes vehicles + counts)
export interface AdminUser extends User {
  vehicles?: {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    color: string;
    vin?: string;
    _count?: { claims: number };
  }[];
  // Latest policy first — the plan the user's claims are deducted from
  policies?: {
    id: string;
    policyNumber: string;
    coverageType: string;
    deductible: number;
    premiumAmount: number;
    coveragePercent: number;
    startDate: string;
    endDate: string;
    template?: { name: string } | null;
  }[];
  _count?: { vehicles: number; claims: number };
}

export type VehicleVerification = 'PENDING' | 'VERIFIED' | 'REJECTED';

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
  valuation?: number | null;
  // Insurance/admin verification of the vehicle and its policy — claims require VERIFIED
  verificationStatus: VehicleVerification;
  verifiedAt?: string | null;
  verificationNotes?: string | null;
  insurancePolicy?: InsurancePolicy | null;
  createdAt: string;
  _count?: { claims: number };
  claims?: Claim[];
}

// Built-in insurance plan managed by the company, one per insurance type (or several tiers)
export interface PolicyTemplate {
  id: string;
  name: string;
  coverageType: string;
  description?: string | null;
  deductible: number;
  coveragePercent: number;
  annualFee: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { policies: number };
}

export interface InsurancePolicy {
  id: string;
  userId: string;
  providerName: string;
  policyNumber: string;
  coverageType: string;
  deductible: number;
  premiumAmount: number;
  coveragePercent: number;
  templateId?: string | null;
  // Vehicle this policy insures — insurance is vehicle-based
  vehicleId?: string | null;
  startDate: string;
  endDate: string;
  template?: { name: string } | null;
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
  affectedParts?: string[];
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

// Current garage estimate layout: parts list + a single labor line + a single paint/materials line
export interface GarageEstimatePart {
  damageType: string;
  partName: string;
  partCost: number;
  addedByGarage?: boolean;
}

export interface GarageEstimateItems {
  parts: GarageEstimatePart[];
  laborHours: number;
  laborRate: number;
  paintMaterials: number;
}

export interface GarageEstimate {
  id: string;
  claimId: string;
  garageId: string;
  items: GarageEstimateItems | GarageEstimateItem[];
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
  // Final claimable amount (LKR) confirmed by the insurer — overrides the computed estimate once set
  finalClaimableValue?: number | null;
  finalValueSetAt?: string | null;
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
