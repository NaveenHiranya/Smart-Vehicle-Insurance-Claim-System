// Garage estimate structure: a parts list plus a single labor line and a single paint/materials line.
// Legacy estimates stored labor hours/rate and paint per item — normalize those into the same shape.

import type { GarageEstimatePart } from '../types';

export type EstimatePartRow = GarageEstimatePart;

export interface StructuredEstimate {
  parts: EstimatePartRow[];
  laborHours: number;
  laborRate: number;
  paintMaterials: number;
}

export const DEFAULT_LABOR_RATE = 3500;

export function normalizeGarageItems(items: unknown): StructuredEstimate {
  if (Array.isArray(items)) {
    // Legacy format: labor and paint were stored on every item
    const parts: EstimatePartRow[] = items.map((i: any) => ({
      damageType: i.damageType || 'other',
      partName: i.partName || '',
      partCost: Number(i.partCost) || 0,
      ...(i.addedByGarage ? { addedByGarage: true } : {}),
    }));
    const laborHours = items.reduce((s, i: any) => s + (Number(i.laborHours) || 0), 0);
    const laborCost = items.reduce((s, i: any) => s + (Number(i.laborCost) || 0), 0);
    const laborRate = laborHours > 0 ? Math.round(laborCost / laborHours) : DEFAULT_LABOR_RATE;
    const paintMaterials = items.reduce((s, i: any) => s + (Number(i.paintMaterials) || 0), 0);
    return { parts, laborHours, laborRate, paintMaterials };
  }
  const obj = (items || {}) as Partial<StructuredEstimate>;
  return {
    parts: Array.isArray(obj.parts) ? (obj.parts as EstimatePartRow[]) : [],
    laborHours: Number(obj.laborHours) || 0,
    laborRate: Number(obj.laborRate) || DEFAULT_LABOR_RATE,
    paintMaterials: Number(obj.paintMaterials) || 0,
  };
}

export function estimateTotals(e: StructuredEstimate) {
  const totalPartsCost = e.parts.reduce((s, p) => s + (Number(p.partCost) || 0), 0);
  const laborCost = Math.round(e.laborHours * e.laborRate);
  const totalLaborCost = laborCost + e.paintMaterials;
  const totalCost = totalPartsCost + totalLaborCost;
  const estimatedDays = Math.max(1, Math.ceil(e.laborHours / 8));
  return { totalPartsCost, laborCost, totalLaborCost, totalCost, estimatedDays };
}
