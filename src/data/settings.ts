export type Settings = {
  hourlyRate: number;
  mileageRate: number;
  spreadsheetId: string;
  refreshIntervalSec: number;
  customGids: Partial<Record<string, number>>;
};

const DEFAULTS: Settings = {
  // 2023-2028 UPS Teamsters contract: top feeder rate ~$49/hr by Aug 2026.
  // Default to $46.50 (Samuel said he's at $46.xx); editable in Settings.
  hourlyRate: 46.5,
  // Single-trailer mileage rate ~$0.95/mi under the 2026 step of the contract;
  // doubles/triples are higher. Editable in Settings.
  mileageRate: 0.95,
  spreadsheetId: "1sIu6_ndtJRlmz-1gRRRBCudsLezPPJ0U",
  refreshIntervalSec: 60,
  customGids: {},
};

const LS_KEY = "tlf:settings:v1";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULTS, ...parsed, customGids: parsed.customGids ?? {} };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export function defaultSettings(): Settings {
  return { ...DEFAULTS, customGids: {} };
}
