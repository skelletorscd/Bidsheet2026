import { RouteToken } from "../types";

const SPECIAL_PATTERNS: RegExp[] = [
  /^WORK\s*AS\s*DIRECTED$/i,
  /^LAYOVER$/i,
  /^CITY\s*WORK.*$/i,
  /^CITY\s*\(.*\)$/i,
  /^TURN[S]?$/i,
];

const NOTE_PATTERNS: RegExp[] = [
  /^Mileage\s*pay\b.*$/i,
  /^LCV$/i,
  /^pad\s*audit$/i,
  /^\(LCV\)$/i,
  /^\(D\)$/i,
  /^\(S\)$/i,
];

const TRAILER_RE = /^\d{3,5}$/;
const LOCATION_RE = /^[A-Z][A-Z0-9]{3,4}$/;

function classifyToken(raw: string): RouteToken {
  const token = raw.trim();
  if (!token) return { kind: "note", text: "" };

  for (const re of SPECIAL_PATTERNS) {
    if (re.test(token)) return { kind: "special", text: token };
  }
  if (TRAILER_RE.test(token)) return { kind: "trailer", num: token };
  if (LOCATION_RE.test(token)) return { kind: "location", code: token };
  for (const re of NOTE_PATTERNS) {
    if (re.test(token)) return { kind: "note", text: token };
  }
  return { kind: "note", text: token };
}

export type RouteParseResult = {
  tokens: RouteToken[];
  payNote: string | null;
};

export function parseRoute(raw: string): RouteParseResult {
  if (!raw) return { tokens: [], payNote: null };

  let working = raw.trim();
  let payNote: string | null = null;

  const dashSplit = working.split(/\s+-\s+/);
  if (dashSplit.length > 1) {
    const last = dashSplit[dashSplit.length - 1];
    if (/^Mileage\s*pay/i.test(last) || /^LCV$/i.test(last)) {
      payNote = last.trim();
      working = dashSplit.slice(0, -1).join(" - ");
    }
  }

  const noteMatch = working.match(/\s+(Mileage\s*pay\b[^,-]*)$/i);
  if (noteMatch) {
    payNote = (payNote ? payNote + " " : "") + noteMatch[1].trim();
    working = working.replace(noteMatch[0], "").trim();
  }

  const parenMatch = working.match(/\(([^)]+)\)/);
  if (parenMatch && /pad\s*audit|LCV/i.test(parenMatch[1])) {
    payNote = (payNote ? payNote + " " : "") + parenMatch[0];
    working = working.replace(parenMatch[0], "").trim();
  }

  const tokens: RouteToken[] = [];
  for (const piece of working.split(/-/)) {
    const cleaned = piece.trim();
    if (!cleaned) continue;
    if (/\s/.test(cleaned) && !LOCATION_RE.test(cleaned)) {
      const subParts = cleaned.split(/\s+/).filter(Boolean);
      const allLocs = subParts.every((p) => LOCATION_RE.test(p));
      if (allLocs) {
        for (const p of subParts) tokens.push(classifyToken(p));
        continue;
      }
    }
    tokens.push(classifyToken(cleaned));
  }
  return { tokens, payNote };
}
