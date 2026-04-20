export type LocationEntry = {
  name: string;
  confirmed: boolean;
};

export const SEED_LOCATIONS: Record<string, LocationEntry> = {
  // Confirmed by Samuel
  TOLOH: { name: "Toledo, OH", confirmed: true },
  NBLOH: { name: "North Baltimore, OH", confirmed: true },

  // Likely correct — needs Samuel to verify
  COLOH: { name: "Columbus, OH", confirmed: false },
  DEFOH: { name: "Defiance, OH", confirmed: false },
  FINOH: { name: "Findlay, OH", confirmed: false },
  MANOH: { name: "Mansfield, OH", confirmed: false },
  SHAOH: { name: "Sharonville, OH", confirmed: false },
  BUFNY: { name: "Buffalo, NY", confirmed: false },
  WALKY: { name: "Walton, KY", confirmed: false },
  DTWMI: { name: "Detroit (DTW), MI", confirmed: false },
  GRAMI: { name: "Grand Rapids, MI", confirmed: false },
  LANMI: { name: "Lansing, MI", confirmed: false },
  LIVMI: { name: "Livonia, MI", confirmed: false },
  TAYMI: { name: "Taylor, MI", confirmed: false },
  CANMI: { name: "Canton, MI", confirmed: false },
  PONMI: { name: "Pontiac, MI", confirmed: false },
  DUBPA: { name: "DuBois, PA", confirmed: true },
  NEWPA: { name: "New Stanton, PA", confirmed: true },
  RFDIL: { name: "Rockford, IL", confirmed: false },
  CCHIL: { name: "Chicago, IL", confirmed: false },
  TOLRR: { name: "Toledo Rail Yard", confirmed: false },
  CSXNB: { name: "CSX North Baltimore Rail", confirmed: false },
};

const LS_KEY = "tlf:locations:v1";

export function loadLocations(): Record<string, LocationEntry> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...SEED_LOCATIONS };
    const parsed = JSON.parse(raw) as Record<string, LocationEntry>;
    return { ...SEED_LOCATIONS, ...parsed };
  } catch {
    return { ...SEED_LOCATIONS };
  }
}

export function saveLocations(map: Record<string, LocationEntry>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function decodeLocation(
  code: string,
  map: Record<string, LocationEntry>,
): { name: string | null; confirmed: boolean; known: boolean } {
  const entry = map[code];
  if (!entry || entry.name === "?" || !entry.name) {
    return { name: null, confirmed: false, known: false };
  }
  return { name: entry.name, confirmed: entry.confirmed, known: true };
}
