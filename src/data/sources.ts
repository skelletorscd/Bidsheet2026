export type TabKey =
  | "toledo"
  | "northBaltimore"
  | "sleeper"
  | "seniority"
  | "oncallToloh"
  | "oncallNbloh"
  | "bidTimes"
  | "locations";

export type TabSource = {
  key: TabKey;
  label: string;
  shortLabel: string;
  hub: "TOL" | "NBL" | "ALL" | null;
  gid: number | null;
  kind: "annualBid" | "seniority" | "bidTimes" | "onCall" | "locations";
};

export const DEFAULT_SPREADSHEET_ID = "1sIu6_ndtJRlmz-1gRRRBCudsLezPPJ0U";

export const TAB_SOURCES: TabSource[] = [
  {
    key: "toledo",
    label: "Toledo Annual",
    shortLabel: "Toledo",
    hub: "TOL",
    gid: 1758902346,
    kind: "annualBid",
  },
  {
    key: "northBaltimore",
    label: "North Baltimore Annual",
    shortLabel: "N. Baltimore",
    hub: "NBL",
    gid: 1635180906,
    kind: "annualBid",
  },
  {
    key: "sleeper",
    label: "Sleeper Team",
    shortLabel: "Sleeper",
    hub: "ALL",
    gid: 1077520417,
    kind: "annualBid",
  },
  {
    key: "seniority",
    label: "Seniority",
    shortLabel: "Seniority",
    hub: null,
    gid: 2137587180,
    kind: "seniority",
  },
  {
    key: "oncallToloh",
    label: "On-Call Toledo",
    shortLabel: "On-Call TOL",
    hub: "TOL",
    gid: 1076391541,
    kind: "onCall",
  },
  {
    key: "oncallNbloh",
    label: "On-Call N. Baltimore",
    shortLabel: "On-Call NBL",
    hub: "NBL",
    gid: 1257999271,
    kind: "onCall",
  },
  {
    key: "bidTimes",
    label: "Bid Times",
    shortLabel: "Bid Times",
    hub: null,
    gid: 1262154739,
    kind: "bidTimes",
  },
  {
    key: "locations",
    label: "Locations",
    shortLabel: "Locations",
    hub: null,
    gid: null,
    kind: "locations",
  },
];

export function csvUrl(spreadsheetId: string, gid: number): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

export function corsProxiedUrl(target: string): string {
  return `https://corsproxy.io/?${encodeURIComponent(target)}`;
}
