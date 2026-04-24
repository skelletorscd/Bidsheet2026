export type TabKey =
  | "dashboard"
  | "toledo"
  | "northBaltimore"
  | "sleeper"
  | "roster"
  | "bidSheets"
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
    | "annualBid"
    | "roster"
    | "bidSheets"
    | "locations"
    | "contact";
};

export const DEFAULT_SPREADSHEET_ID = "1sIu6_ndtJRlmz-1gRRRBCudsLezPPJ0U";

export const TAB_SOURCES: TabSource[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    hub: null,
    gid: null,
    kind: "dashboard",
  },
  {
    key: "toledo",
    label: "Toledo",
    shortLabel: "Toledo",
    hub: "TOL",
    gid: 1758902346,
    kind: "annualBid",
  },
  {
    key: "northBaltimore",
    label: "North Baltimore",
    shortLabel: "N. Baltimore",
    hub: "NBL",
    gid: 1635180906,
    kind: "annualBid",
  },
  {
    key: "sleeper",
    label: "Sleeper",
    shortLabel: "Sleeper",
    hub: "ALL",
    gid: 1077520417,
    kind: "annualBid",
  },
  {
    key: "roster",
    label: "Roster",
    shortLabel: "Roster",
    hub: null,
    gid: null,
    kind: "roster",
  },
  {
    key: "bidSheets",
    label: "Bid Sheets",
    shortLabel: "Sheets",
    hub: null,
    gid: null,
    kind: "bidSheets",
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
