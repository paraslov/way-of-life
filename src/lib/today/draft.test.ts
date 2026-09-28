import { describe, expect, it } from "vitest";
import type { CheckinRow, SymptomEntryRow } from "./checkin";
import { buildDraft, type DraftSource } from "./draft";

function row(date: string, fields: Partial<CheckinRow> = {}): CheckinRow {
  return {
    local_date: date,
    sleep_minutes: null,
    sleep_score: null,
    rhr: null,
    hrv_ms: null,
    hrv_status: null,
    energy: null,
    desire: null,
    legs: null,
    steps: null,
    red_flags: [],
    note: null,
    ...fields,
  };
}

function entry(
  id: string,
  date: string,
  severity: number,
  context: SymptomEntryRow["context"] = null,
): SymptomEntryRow {
  return {
    local_date: date,
    symptom_id: id,
    key: id,
    severity,
    context,
    heart_rate: null,
  };
}

const SYMPTOMS: DraftSource["symptoms"] = [
  { id: "knee", key: "knee", name: "Колено", scale: "0_10", pinned: true },
  {
    id: "palpitations",
    key: "palpitations",
    name: "Перебои",
    scale: "bool",
    pinned: true,
  },
  {
    id: "reflux",
    key: "reflux",
    name: "Рефлюкс",
    scale: "0_10",
    pinned: false,
  },
  { id: "calf", key: "calf", name: "Икра", scale: "0_10", pinned: false },
];

const EMPTY: DraftSource = {
  checkin: null,
  previous: null,
  symptoms: SYMPTOMS,
  entries: [],
  previousEntries: [],
};

describe("buildDraft", () => {
  it("is empty on the first day, with yes/no symptoms at «нет»", () => {
    const draft = buildDraft(EMPTY);
    expect(draft).toMatchObject({
      sleep: "",
      rhr: null,
      fromPrevious: false,
    });
    expect(draft.symptoms.map((s) => [s.id, s.severity])).toEqual([
      ["knee", null],
      ["palpitations", 0],
    ]);
  });

  it("prefills from the previous morning, without its note or flags", () => {
    const draft = buildDraft({
      ...EMPTY,
      previous: row("2026-10-18", {
        sleep_minutes: 412,
        rhr: 47,
        desire: 3,
        note: "вчерашняя",
        red_flags: ["chest_pain"],
      }),
      previousEntries: [
        entry("knee", "2026-10-18", 2, "rest"),
        entry("reflux", "2026-10-18", 3),
      ],
    });
    expect(draft).toMatchObject({
      sleep: "6:52",
      rhr: 47,
      desire: 3,
      note: "",
      redFlags: [],
      fromPrevious: true,
    });
    expect(draft.symptoms.map((s) => s.id)).toEqual([
      "knee",
      "palpitations",
      "reflux",
    ]);
    expect(draft.symptoms[0]).toMatchObject({ severity: 2, atRest: true });
  });

  it("uses today's saved check-in when there is one", () => {
    const draft = buildDraft({
      ...EMPTY,
      checkin: row("2026-10-19", { sleep_minutes: 450, note: "ок" }),
      previous: row("2026-10-18", { sleep_minutes: 300 }),
      entries: [entry("palpitations", "2026-10-19", 1)],
    });
    expect(draft).toMatchObject({
      sleep: "7:30",
      note: "ок",
      fromPrevious: false,
    });
    expect(draft.symptoms[1]).toMatchObject({ severity: 1 });
  });

  it("treats a steps-only row as no check-in yet", () => {
    const draft = buildDraft({
      ...EMPTY,
      checkin: row("2026-10-19", { steps: 9000 }),
      previous: row("2026-10-18", { rhr: 49 }),
    });
    expect(draft).toMatchObject({ rhr: 49, fromPrevious: true });
  });
});
