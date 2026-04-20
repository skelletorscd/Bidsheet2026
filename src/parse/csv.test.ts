import { describe, it, expect } from "vitest";
import { parseAnnualBidCsv } from "./csv";

const SAMPLE = `2026 Toledo Annual Feeder Bid Notice,,,,,,
"Notice text...",,,,,,
,Start Time,Job #,Job Qualifications,Job Days,Job Description,Schedule
1,0:15,WP01,LCV,Mon,WPOIN-TOLOH,10.4
,,,,Tues,WPOIN-TOLOH-NBLOH-TOLOH,12.88
,,,,Wed - Fri,WPOIN-TOLOH,10.84
,,,,,,
2,1:00,TD15,Mileage Pay (D),Tue,DUBPA-TOLOH,554 Miles
,,,,Wed,DUBPA-NBLOH-TOLOH,605 Miles
,,,,Thurs,DUBPA-TOLOH,554 Miles
,,,,Fri,DUBPA-NBLOH-TOLOH,605 Miles
,,,,Sat,DUBPA-TOLOH,554 Miles
,,,,,,
25,5:00,TLOR,LCV/Mileage Pay (D),Thurs,CCHIL-WPOIN-TOLOH-NBLOH-TOLOH,550 Miles
,,,,Fri,CCHIL-WPOIN-TOLOH,500 Miles
,6:00,,AIR BADGE REQUIRED,Sat - Sun,CCHIL-RFDIL- LAYOVER-RFDIL-DTWMI-TOLOH,
,,,,,,
56,15:45,CPU1,(D),Mon - Thur,FPROH-TOLOH-TKXOH-TOLOH-NBLOH-TOLOH-,11.97
,,,,,CANMI-CUSMI-CANMI-TOLOH,
,,,,Fri,FPROH-TOLOH-TKXOH-TOLOH-NBLOH-TOLOH-,11.08
,,,,,CANMI-TOLOH,
`;

describe("parseAnnualBidCsv", () => {
  const parsed = parseAnnualBidCsv(SAMPLE);

  it("extracts the right number of bids", () => {
    expect(parsed.bids).toHaveLength(4);
  });

  it("parses WP01 with three legs and 5 days/week", () => {
    const wp01 = parsed.bids.find((b) => b.jobNum === "WP01");
    expect(wp01).toBeDefined();
    expect(wp01!.legs).toHaveLength(3);
    expect(wp01!.daysPerWeek).toBe(5);
    expect(wp01!.payType).toBe("hourly");
    expect(wp01!.startTime24).toBe("0:15");
    expect(wp01!.startTime12).toBe("12:15 AM");
    expect(wp01!.totalHoursPerWeek).toBeCloseTo(10.4 + 12.88 + 10.84 * 3, 2);
  });

  it("parses TD15 mileage bid", () => {
    const td15 = parsed.bids.find((b) => b.jobNum === "TD15")!;
    expect(td15.payType).toBe("mileage");
    expect(td15.daysPerWeek).toBe(5);
    expect(td15.totalMilesPerWeek).toBe(554 + 605 + 554 + 605 + 554);
    expect(td15.hasWeekend).toBe(true);
  });

  it("captures leg-level startTime and qual override on TLOR", () => {
    const tlor = parsed.bids.find((b) => b.jobNum === "TLOR")!;
    const weekendLeg = tlor.legs.find((l) => l.startTimeOverride24);
    expect(weekendLeg).toBeDefined();
    expect(weekendLeg!.startTimeOverride24).toBe("6:00");
    expect(weekendLeg!.qualOverride).toMatch(/AIR BADGE/i);
    expect(weekendLeg!.days).toEqual(["Sat", "Sun"]);
  });

  it("merges wrapped route lines for CPU1", () => {
    const cpu1 = parsed.bids.find((b) => b.jobNum === "CPU1")!;
    expect(cpu1.legs).toHaveLength(2);
    expect(cpu1.legs[0].routeRaw).toMatch(/CANMI-CUSMI-CANMI-TOLOH/);
    expect(cpu1.legs[1].routeRaw).toMatch(/CANMI-TOLOH$/);
  });

  it("classifies LAYOVER as a special token, not a location", () => {
    const tlor = parsed.bids.find((b) => b.jobNum === "TLOR")!;
    const weekendLeg = tlor.legs[2];
    const layover = weekendLeg.routeTokens.find((t) => t.kind === "special");
    expect(layover).toBeDefined();
  });
});

describe("parseAnnualBidCsv — taken-by column", () => {
  const LIVE_SAMPLE = `2026 Toledo Annual Feeder Bid Notice,,,,,,,
"Notice",,,,,,,
,Start Time,Job #,Job Qualifications,Job Days,Job Description,Schedule,
1,0:15,WP01,LCV,Mon,WPOIN-TOLOH,10.4,
,,,,Tues,WPOIN-TOLOH-NBLOH-TOLOH,12.88,
,,,,,,,
2,1:00,TD15,Mileage Pay (D),Tue,DUBPA-TOLOH,554 Miles,
,,,,Wed,DUBPA-NBLOH-TOLOH,605 Miles,Bill Seeger
,,,,Thurs,DUBPA-TOLOH,554 Miles,
,,,,,,,
4,1:00,TD10,Mileage Pay (D),Tue - Sat,MIDOH-DUXPA-TOLOH,558 Miles,Jack Kreiner
,,,,,,,
`;
  const parsed = parseAnnualBidCsv(LIVE_SAMPLE);

  it("leaves untaken bids as available", () => {
    const wp01 = parsed.bids.find((b) => b.jobNum === "WP01")!;
    expect(wp01.status).toBe("available");
    expect(wp01.takenBy).toBeNull();
  });

  it("marks bid as taken when name appears on a continuation row", () => {
    const td15 = parsed.bids.find((b) => b.jobNum === "TD15")!;
    expect(td15.status).toBe("taken");
    expect(td15.takenBy).toBe("Bill Seeger");
  });

  it("marks bid as taken when name appears on the primary row", () => {
    const td10 = parsed.bids.find((b) => b.jobNum === "TD10")!;
    expect(td10.status).toBe("taken");
    expect(td10.takenBy).toBe("Jack Kreiner");
  });
});
