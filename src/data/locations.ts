import { DIRECTORY, DIRECTORY_BY_CODE } from "./directory.generated";

export type LocationEntry = {
  name: string;
  confirmed: boolean;
  address?: string;
  facility?: string;
  phone?: string;
  notes?: string;
  slic?: string;
  state?: string;
  category?: "center" | "airport" | "toll" | "other";
};

export { DIRECTORY };

/**
 * Turn the baked directory into the LocationEntry shape so the rest of the
 * app (RouteRender, BidDetail, etc.) can read it directly.
 */
export const DIRECTORY_ENTRIES: Record<string, LocationEntry> = (() => {
  const out: Record<string, LocationEntry> = {};
  for (const [code, r] of Object.entries(DIRECTORY_BY_CODE)) {
    const label = r.state ? `${r.city}, ${r.state}` : r.city;
    out[code] = {
      name: label,
      confirmed: true,
      address: r.address ?? undefined,
      phone: r.phone ?? undefined,
      notes: r.notes ?? undefined,
      slic: r.slic ?? undefined,
      state: r.state ?? undefined,
      category: r.category,
      facility:
        r.category === "airport"
          ? "UPS Airport Ramp"
          : r.category === "toll"
            ? "Toll Plaza"
            : undefined,
    };
  }
  return out;
})();

const SEED_OVERRIDES: Record<string, LocationEntry> = {
  // Confirmed hubs
  TOLOH: {
    name: "Toledo, OH",
    facility: "UPS Toledo Hub",
    address: "1550 Holland Rd, Maumee, OH 43537",
    confirmed: true,
  },
  NBLOH: {
    name: "North Baltimore, OH",
    facility: "UPS Centennial Hub",
    address: "16615 Deshler Rd, North Baltimore, OH 45872",
    confirmed: true,
  },
  CCHIL: {
    name: "Chicago, IL",
    facility: "UPS CACH (Chicago Area Consolidation Hub)",
    address: "1 UPS Way, Hodgkins, IL 60525",
    confirmed: true,
  },

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
  NEWPA: {
    name: "New Stanton, PA",
    facility: "UPS New Stanton Sort",
    confirmed: true,
  },
  RFDIL: { name: "Rockford, IL", confirmed: false },
  TOLRR: { name: "Toledo Rail Yard", confirmed: false },
  CSXNB: { name: "CSX North Baltimore Rail", confirmed: false },
};

// Seed = directory (authoritative) + any legacy overrides for codes not yet
// in the directory (e.g. rail yards).
export const SEED_LOCATIONS: Record<string, LocationEntry> = {
  ...SEED_OVERRIDES,
  ...DIRECTORY_ENTRIES,
};

export function mapsUrl(entry: LocationEntry): string {
  const q = entry.address
    ? entry.address
    : entry.facility
      ? `${entry.facility} ${entry.name}`
      : entry.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/**
 * Directions link — opens Google Maps and starts navigation from the user's
 * current location. On mobile, this opens the Google Maps app directly.
 */
export function mapsDirectionsUrl(
  address: string | null | undefined,
  fallback: string,
): string {
  const dest = (address && address.trim()) || fallback;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}

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
