export type TabKey =
  | "dashboard"
  | "clock"
  | "account"
  | "seniority"
  | "routes"
  | "onCallToledo"
  | "onCallNbl"
  | "locations"
  | "weather"
  | "contact";

export type TabSource = {
  key: TabKey;
  label: string;
  shortLabel: string;
  hub: "TOL" | "NBL" | "ALL" | null;
  gid: number | null;
  kind:
    | "dashboard"
    | "clock"
    | "account"
    | "seniority"
    | "routes"
    | "onCallHub"
    | "locations"
    | "weather"
    | "contact";
};

export const DEFAULT_SPREADSHEET_ID = "1sIu6_ndtJRlmz-1gRRRBCudsLezPPJ0U";

export const TAB_SOURCES: TabSource[] = [
  {
    key: "dashboard",
    label: "Home",
    shortLabel: "Home",
    hub: null,
    gid: null,
    kind: "dashboard",
  },
  {
    key: "seniority",
    label: "Seniority",
    shortLabel: "Seniority",
    hub: null,
    gid: null,
    kind: "seniority",
  },
  {
    key: "routes",
    label: "Routes",
    shortLabel: "Routes",
    hub: null,
    gid: null,
    kind: "routes",
  },
  {
    key: "locations",
    label: "Locations",
    shortLabel: "Locations",
    hub: null,
    gid: null,
    kind: "locations",
  },
  {
    key: "weather",
    label: "Weather",
    shortLabel: "Weather",
    hub: null,
    gid: null,
    kind: "weather",
  },
  {
    key: "onCallToledo",
    label: "On-Call Toledo",
    shortLabel: "OC Toledo",
    hub: "TOL",
    gid: null,
    kind: "onCallHub",
  },
  {
    key: "onCallNbl",
    label: "On-Call N. Baltimore",
    shortLabel: "OC NBL",
    hub: "NBL",
    gid: null,
    kind: "onCallHub",
  },
  {
    key: "account",
    label: "Account",
    shortLabel: "Account",
    hub: null,
    gid: null,
    kind: "account",
  },
  {
    key: "clock",
    label: "Pay Clock",
    shortLabel: "Pay",
    hub: null,
    gid: null,
    kind: "clock",
  },
  {
    key: "contact",
    label: "Contact",
    shortLabel: "Contact",
    hub: null,
    gid: null,
    kind: "contact",
  },
];

export function csvUrl(_spreadsheetId: string, _gid: number): string {
  return `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/htmlview`;
}

export function corsProxiedUrl(target: string): string {
  return target;
}
