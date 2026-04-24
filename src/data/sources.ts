export type TabKey =
  | "dashboard"
  | "seniority"
  | "bidSheet"
  | "onCallToledo"
  | "onCallNbl"
  | "locations"
  | "contact";

export type TabSource = {
  key: TabKey;
  label: string;
  shortLabel: string;
  hub: "TOL" | "NBL" | "ALL" | null;
  gid: number | null;
  kind:
    | "dashboard"
    | "seniority"
    | "bidSheet"
    | "onCallHub"
    | "locations"
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
    key: "locations",
    label: "Locations",
    shortLabel: "Locations",
    hub: null,
    gid: null,
    kind: "locations",
  },
  {
    key: "bidSheet",
    label: "Bid Sheet",
    shortLabel: "Bid Sheet",
    hub: null,
    gid: null,
    kind: "bidSheet",
  },
  {
    key: "contact",
    label: "Contact",
    shortLabel: "Contact",
    hub: null,
    gid: null,
    kind: "contact",
  },
  {
    key: "seniority",
    label: "Seniority",
    shortLabel: "Seniority",
    hub: null,
    gid: null,
    kind: "seniority",
  },
];

export function csvUrl(_spreadsheetId: string, _gid: number): string {
  return `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/htmlview`;
}

export function corsProxiedUrl(target: string): string {
  return target;
}
