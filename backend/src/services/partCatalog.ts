import type { VehicleType } from '../types/index.js';

/**
 * Canonical part catalog (LKR). One source of truth for three things:
 *  1. the enum offered to the damage-analysis model via responseSchema,
 *  2. price lookup in the repair estimator (exact ID match),
 *  3. human-readable labels for estimate line items.
 *
 * `keywords` only serve legacy damage rows written before the catalog existed
 * (free-text affectedParts / locations stored in the DB).
 */
export interface PartFamily {
  label: string;
  keywords: string[];
  base: [number, number];
  types?: Partial<Record<VehicleType, [number, number]>>;
}

export const PART_CATALOG: Record<string, PartFamily> = {
  headlight:    { label: 'headlight',    keywords: ['headlight', 'head lamp'],                     base: [22000, 95000] },
  taillight:    { label: 'taillight',    keywords: ['taillight', 'tail light', 'rear light'],      base: [15000, 60000] },
  fog_light:    { label: 'fog light',    keywords: ['fog light', 'fog lamp'],                      base: [8000, 35000] },
  windshield:   { label: 'windshield',   keywords: ['windshield', 'windscreen', 'front glass'],    base: [35000, 185000] },
  rear_glass:   { label: 'rear glass',   keywords: ['rear glass', 'back glass', 'rear window'],    base: [25000, 120000] },
  side_mirror:  { label: 'side mirror',  keywords: ['side mirror', 'wing mirror'],                 base: [9000, 45000] },
  front_bumper: { label: 'front bumper', keywords: ['front bumper'],                               base: [28000, 135000] },
  rear_bumper:  { label: 'rear bumper',  keywords: ['rear bumper'],                                base: [26000, 125000] },
  bumper:       { label: 'bumper',       keywords: ['bumper'],                                     base: [27000, 130000] },
  grille:       { label: 'grille',       keywords: ['grille', 'grill'],                            base: [12000, 65000] },
  hood:         { label: 'hood',         keywords: ['hood', 'bonnet'],                             base: [35000, 150000], types: { THREE_WHEELER: [25000, 70000] } },
  door:         { label: 'door',         keywords: ['door'],                                       base: [38000, 165000] },
  fender:       { label: 'fender',       keywords: ['fender', 'wing panel'],                       base: [24000, 110000] },
  quarter_panel:{ label: 'quarter panel',keywords: ['quarter panel'],                              base: [40000, 175000] },
  canopy:       { label: 'canopy',       keywords: ['canopy', 'front cabin'],                      base: [25000, 70000] },
  roof:         { label: 'roof',         keywords: ['roof'],                                       base: [45000, 200000] },
  trunk_lid:    { label: 'trunk lid',    keywords: ['trunk', 'boot lid', 'tailgate'],              base: [36000, 155000] },
  side_skirt:   { label: 'side skirt',   keywords: ['running board', 'side skirt'],                base: [12000, 55000] },
  radiator:     { label: 'radiator',     keywords: ['radiator'],                                   base: [28000, 95000] },
  condenser:    { label: 'condenser',    keywords: ['condenser', 'ac condenser'],                  base: [25000, 85000] },
  wheel:        { label: 'wheel',        keywords: ['tyre', 'tire', 'rim', 'alloy'],               base: [18000, 95000] },
  exhaust:      { label: 'exhaust',      keywords: ['exhaust', 'muffler', 'silencer'],             base: [12000, 65000] },
  seat:         { label: 'seat',         keywords: ['seat', 'interior'],                           base: [15000, 90000] },
  fairing:      { label: 'fairing',      keywords: ['fairing'],                                    base: [12000, 55000] },
  handlebar:    { label: 'handlebar',    keywords: ['handlebar', 'handle bar'],                    base: [6000, 28000] },
  cargo_body:   { label: 'cargo body',   keywords: ['cargo body', 'cargo bed', 'deck body'],       base: [150000, 600000] },
  cab:          { label: 'cab',          keywords: ['cab', 'cabin'],                                 base: [120000, 450000] },
  body_panel:   { label: 'body panel',   keywords: ['body panel'],                                   base: [80000, 350000] },
  trailer:      { label: 'trailer',      keywords: ['trailer'],                                    base: [80000, 400000] },
};

export const PART_IDS = Object.keys(PART_CATALOG);

/** Catalog ID or legacy free text → display label */
export function partLabel(part: string): string {
  return PART_CATALOG[part]?.label ?? part;
}
