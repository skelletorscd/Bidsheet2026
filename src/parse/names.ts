// Common nickname / short-form mappings so "Bill Seeger" in the bid sheet
// cross-references with "WILLIAM SEEGER" in the seniority sheet.
const NICKNAMES: Record<string, string[]> = {
  william: ["bill", "billy", "will", "willie"],
  robert: ["bob", "bobby", "rob", "robbie"],
  james: ["jim", "jimmy", "jamie"],
  john: ["jack", "johnny", "jon"],
  michael: ["mike", "mikey"],
  kenneth: ["ken", "kenny"],
  thomas: ["tom", "tommy"],
  richard: ["rick", "rich", "richie", "dick"],
  patrick: ["pat", "patty"],
  david: ["dave", "davy"],
  joseph: ["joe", "joey"],
  daniel: ["dan", "danny"],
  christopher: ["chris"],
  douglas: ["doug"],
  ronald: ["ron", "ronnie"],
  gregory: ["greg"],
  andrew: ["andy", "drew"],
  anthony: ["tony"],
  steven: ["steve"],
  stephen: ["steve"],
  matthew: ["matt"],
  bradley: ["brad"],
  edward: ["ed", "eddie", "ted"],
  timothy: ["tim", "timmy"],
  charles: ["charlie", "chuck"],
  benjamin: ["ben"],
  nicholas: ["nick"],
  jonathan: ["jon", "jonny"],
  lawrence: ["larry"],
  kevin: ["kev"],
  jeffrey: ["jeff"],
  samuel: ["sam", "sammy"],
  alexander: ["alex"],
  frederick: ["fred", "freddy"],
  terrence: ["terry"],
  terence: ["terry"],
  gerald: ["gerry", "jerry"],
  eugene: ["gene"],
  raymond: ["ray"],
  russell: ["russ"],
  cameron: ["cam"],
  nathaniel: ["nate", "nathan"],
  calvin: ["cal"],
  patricia: ["patty", "pat", "patti"],
  elizabeth: ["liz", "beth", "betsy", "betty"],
  katherine: ["kathy", "kate", "katie"],
  catherine: ["cathy", "cate", "katie"],
  margaret: ["maggie", "margie", "peggy"],
  rebecca: ["becky", "becca"],
  jennifer: ["jen", "jenny"],
  susan: ["sue", "susie"],
  barbara: ["barb", "barbie"],
};

// Reverse lookup: "bill" → "william", "mike" → "michael"
const NICKNAME_TO_FULL: Record<string, string> = Object.fromEntries(
  Object.entries(NICKNAMES).flatMap(([full, nicks]) =>
    nicks.map((n) => [n, full]),
  ),
);

function canonical(first: string): string {
  const lower = first.toLowerCase();
  return NICKNAME_TO_FULL[lower] ?? lower;
}

export type NormalizedName = {
  full: string;
  first: string;
  last: string;
  firstCanonical: string;
};

export function normalizeName(raw: string): NormalizedName {
  const clean = raw.replace(/\s+/g, " ").trim();
  const parts = clean.split(" ").filter(Boolean);
  const last = (parts[parts.length - 1] ?? "").toLowerCase();
  const first = (parts[0] ?? "").toLowerCase();
  return {
    full: clean.toLowerCase(),
    first,
    last,
    firstCanonical: canonical(first),
  };
}

export function namesMatch(a: NormalizedName, b: NormalizedName): boolean {
  if (!a.last || !b.last) return false;
  if (a.last !== b.last) return false;
  if (a.firstCanonical && b.firstCanonical) {
    if (a.firstCanonical === b.firstCanonical) return true;
    // First-initial match: "B. Seeger" → "Bill Seeger"
    if (
      a.firstCanonical.charAt(0) === b.firstCanonical.charAt(0) &&
      (a.firstCanonical.length === 1 || b.firstCanonical.length === 1)
    ) {
      return true;
    }
  }
  return false;
}
