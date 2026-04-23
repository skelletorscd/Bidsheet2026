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
  richard: ["rick", "rich", "richie", "ricky", "dick"],
  patrick: ["pat", "patty"],
  david: ["dave", "davy", "davey"],
  joseph: ["joe", "joey"],
  daniel: ["dan", "danny"],
  christopher: ["chris", "topher"],
  douglas: ["doug", "dougie"],
  donald: ["don", "donny", "donnie"],
  ronald: ["ron", "ronnie", "ronny"],
  gregory: ["greg", "gregg"],
  andrew: ["andy", "drew"],
  anthony: ["tony"],
  steven: ["steve", "stevie"],
  stephen: ["steve", "stevie"],
  matthew: ["matt", "matty"],
  bradley: ["brad"],
  brady: ["brad"],
  edward: ["ed", "eddie", "ted"],
  timothy: ["tim", "timmy"],
  charles: ["charlie", "chuck", "chas"],
  benjamin: ["ben", "benny"],
  nicholas: ["nick", "nicky"],
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
  walter: ["walt", "wally"],
  philip: ["phil", "phillip"],
  phillip: ["phil", "philip"],
  curtis: ["curt"],
  lucas: ["luke"],
  joshua: ["josh", "joshie"],
  zachary: ["zack", "zach"],
  zacharias: ["zach", "zack"],
  bryan: ["bry"],
  mitchell: ["mitch"],
  vincent: ["vinny", "vince"],
  francis: ["frank", "fran"],
  franklin: ["frank", "franky"],
  martin: ["marty"],
  randall: ["randy"],
  randolph: ["randy"],
  derrick: ["derek"],
  derek: ["derrick"],
  isaac: ["ike"],
  jacob: ["jake"],
  jonathon: ["jon", "jonny"],
  reginald: ["reggie"],
  patricia: ["patty", "pat", "patti"],
  elizabeth: ["liz", "beth", "betsy", "betty"],
  katherine: ["kathy", "kate", "katie"],
  catherine: ["cathy", "cate", "katie"],
  margaret: ["maggie", "margie", "peggy"],
  rebecca: ["becky", "becca"],
  jennifer: ["jen", "jenny"],
  susan: ["sue", "susie"],
  barbara: ["barb", "barbie"],
  tamara: ["tammy"],
  pamela: ["pam"],
  jessica: ["jess", "jessie"],
};

/**
 * Manual overrides for cases where the bid sheet uses a name that can't be
 * resolved automatically (an obscure nickname, a known data-entry quirk, or
 * a genuinely different short form). Keys are normalized "first last" from
 * the bid sheet; values are normalized "first last" from the seniority list.
 *
 * Add entries here when you spot a chronic mismatch. Keep both sides
 * lowercase and space-separated.
 */
const MANUAL_OVERRIDES: Record<string, string> = {
  "bo rollman": "francis rollman",
  "dj lambdin": "donal lambdin",
};

/** Suffixes we strip so "Larry Brown II" matches "Larry Brown". */
const SUFFIX_RE =
  /[\s,]+(?:jr\.?|sr\.?|ii|iii|iv|v|2nd|3rd|4th)\s*$/i;

export type NormalizedName = {
  full: string;
  first: string;
  last: string;
  /** Every name this could be — itself plus any canonical full forms it
   *  nicknames, plus any nicknames its canonical form has. Used for set
   *  intersection in namesMatch. */
  firstCanonicals: Set<string>;
};

export function normalizeName(raw: string): NormalizedName {
  let clean = raw.replace(/\s+/g, " ").trim();
  // Insert a space inside camelCase blobs ONLY if the input has no spaces
  // at all ("DougWilson" → "Doug Wilson"). If the user wrote spaces, we
  // trust them and don't split — otherwise we'd mangle "McNeal", "DiMaria",
  // "O'Brien" style names.
  if (!/\s/.test(clean)) {
    clean = clean.replace(/([a-z])([A-Z])/g, "$1 $2");
  }

  // Strip generation suffixes (Jr, II, III, etc.) iteratively in case the
  // sheet has multiple ("John Smith Jr II").
  while (SUFFIX_RE.test(clean)) {
    clean = clean.replace(SUFFIX_RE, "").trim();
  }

  let parts = clean.split(" ").filter(Boolean);

  // Skip leading single-letter initials ("G BRADY SKALKU" → "BRADY SKALKU").
  while (
    parts.length > 1 &&
    /^[A-Za-z]\.?$/.test(parts[0]) &&
    parts.length > 1
  ) {
    parts = parts.slice(1);
  }

  const last = (parts[parts.length - 1] ?? "").toLowerCase();
  const first = (parts[0] ?? "").toLowerCase();

  // Apply manual override AFTER cleanup. Both sides go through normalize.
  const lookupKey = `${first} ${last}`;
  const override = MANUAL_OVERRIDES[lookupKey];
  if (override) {
    const overrideParts = override.split(" ").filter(Boolean);
    const oFirst = overrideParts[0] ?? "";
    const oLast = overrideParts[overrideParts.length - 1] ?? "";
    return {
      full: override,
      first: oFirst,
      last: oLast,
      firstCanonicals: canonicalSet(oFirst),
    };
  }

  return {
    full: clean.toLowerCase(),
    first,
    last,
    firstCanonicals: canonicalSet(first),
  };
}

function canonicalSet(first: string): Set<string> {
  const set = new Set<string>();
  if (!first) return set;
  set.add(first);
  // If this name itself has known nicknames, add them — handles full-form
  // input ("WILLIAM" → matches "Bill"). Symmetric.
  const ownNicks = NICKNAMES[first];
  if (ownNicks) for (const n of ownNicks) set.add(n);
  // If this name IS a nickname, add every full form it could be — handles
  // ambiguity ("Pat" → matches both Patrick AND Patricia, "Steve" matches
  // both Steven AND Stephen).
  for (const [full, nicks] of Object.entries(NICKNAMES)) {
    if (nicks.includes(first)) {
      set.add(full);
      // And include sibling nicknames so "Bill" → "Billy" works.
      for (const n of nicks) set.add(n);
    }
  }
  return set;
}

export function namesMatch(a: NormalizedName, b: NormalizedName): boolean {
  if (!a.last || !b.last) return false;
  // Last names must match exactly, OR be 1 character apart for typos
  // ("Flemimg" ↔ "Fleming"). Length-gate this to avoid collapsing short
  // common names like "Cook" / "Coop".
  if (a.last !== b.last) {
    if (
      Math.min(a.last.length, b.last.length) >= 5 &&
      Math.abs(a.last.length - b.last.length) <= 1 &&
      editDistance(a.last, b.last) <= 1
    ) {
      // last names are close enough — keep going
    } else {
      return false;
    }
  }

  // Set intersection on first-name canonicals.
  for (const c of a.firstCanonicals) {
    if (b.firstCanonicals.has(c)) return true;
  }

  // Initial-only match: "DJ Lambdin" vs "Donal Lambdin" — first letters
  // align AND one side is short enough to be initials/abbrev. Last names
  // already matched above.
  const shortest = Math.min(a.first.length, b.first.length);
  if (shortest > 0 && a.first.charAt(0) === b.first.charAt(0)) {
    if (shortest <= 3) return true;
  }

  // Edit-distance ≤ 1 catches single-character typos like "Joeseph" ↔
  // "Joseph". Length-gate to keep this from over-matching short names.
  if (
    Math.min(a.first.length, b.first.length) >= 4 &&
    Math.abs(a.first.length - b.first.length) <= 1 &&
    editDistance(a.first, b.first) <= 1
  ) {
    return true;
  }

  return false;
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] =
        a.charAt(i - 1) === b.charAt(j - 1)
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}
