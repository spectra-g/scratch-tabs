import { generateRota, rotaToText } from "../rotaModel";
import { DEFAULT_ROTA_CONFIG } from "../../contentModel";
import type { RotaConfig } from "../../types";

const config = (patch: Partial<RotaConfig> = {}): RotaConfig => ({
  ...DEFAULT_ROTA_CONFIG,
  startDate: "2026-08-03", // a Monday
  periods: 4,
  seed: 1,
  ...patch,
});

describe("generateRota", () => {
  it("returns no slots without names", () => {
    expect(generateRota(["  ", ""], config())).toEqual([]);
  });

  it("cycles through names in order for weekly frequency", () => {
    const slots = generateRota(["Alice", "Bob"], config());
    expect(slots).toEqual([
      { date: "2026-08-03", name: "Alice" },
      { date: "2026-08-10", name: "Bob" },
      { date: "2026-08-17", name: "Alice" },
      { date: "2026-08-24", name: "Bob" },
    ]);
  });

  it("advances one day at a time for daily frequency", () => {
    const slots = generateRota(["Alice", "Bob"], config({ frequency: "daily" }));
    expect(slots.map((slot) => slot.date)).toEqual([
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
    ]);
    expect(slots.map((slot) => slot.name)).toEqual(["Alice", "Bob", "Alice", "Bob"]);
  });

  it("rolls weekend changes forward to Monday when skipping weekends", () => {
    // Friday start: daily steps land on Sat/Sun and must move to Mon.
    const slots = generateRota(
      ["Alice", "Bob", "Charlie"],
      config({ frequency: "daily", skipWeekends: true, startDate: "2026-08-07" }),
    );
    expect(slots.map((slot) => slot.date)).toEqual([
      "2026-08-07",
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
    ]);
  });

  it("keeps weekend dates when not skipping weekends", () => {
    const slots = generateRota(
      ["Alice"],
      config({ frequency: "daily", skipWeekends: false, startDate: "2026-08-07" }),
    );
    expect(slots.map((slot) => slot.date)).toEqual([
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
      "2026-08-10",
    ]);
  });

  it("uses every name once per pass when shuffling", () => {
    const names = ["Alice", "Bob", "Charlie", "Diana"];
    const slots = generateRota(names, config({ order: "shuffle", periods: 8 }));
    expect(slots.slice(0, 4).map((slot) => slot.name).sort()).toEqual(names);
    expect(slots.slice(4).map((slot) => slot.name).sort()).toEqual(names);
  });

  it("produces stable shuffle output until the config or names change", () => {
    const first = generateRota(["Alice", "Bob", "Charlie"], config({ order: "shuffle" }));
    const second = generateRota(["Alice", "Bob", "Charlie"], config({ order: "shuffle" }));
    expect(first).toEqual(second);
    const reshuffled = generateRota(
      ["Alice", "Bob", "Charlie"],
      config({ order: "shuffle", seed: 2 }),
    );
    expect(reshuffled).not.toEqual(first);
  });

  it("falls back to today for invalid start dates", () => {
    const slots = generateRota(["Alice"], config({ startDate: "not-a-date", frequency: "daily" }));
    const today = new Date();
    const iso = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-${`${today.getDate()}`.padStart(2, "0")}`;
    expect(slots[0]?.date).toBe(iso);
  });
});

describe("rotaToText", () => {
  it("formats one date-name line per slot", () => {
    expect(
      rotaToText([
        { date: "2026-08-03", name: "Alice" },
        { date: "2026-08-10", name: "Bob" },
      ]),
    ).toBe("2026-08-03 Alice\n2026-08-10 Bob");
  });
});
