import { describe, expect, it } from "vitest";

import {
  bumpFoodCandidate,
  type FoodCandidateSource,
  filterFoodCandidates,
  foldFoodCandidates,
} from "./food-candidates";

const entry = (
  name: string,
  overrides: Partial<FoodCandidateSource> = {},
): FoodCandidateSource => ({
  name,
  qty: "100 g",
  kcal: 100,
  protein_g: 10,
  fat_g: 1,
  carb_g: 5,
  ...overrides,
});

describe("foldFoodCandidates", () => {
  it("同じ食品名を 1 件に畳み、回数を数える", () => {
    const candidates = foldFoodCandidates([
      entry("鶏むね"),
      entry("卵"),
      entry("鶏むね"),
      entry("鶏むね"),
    ]);

    expect(candidates.map((c) => [c.name, c.count])).toEqual([
      ["鶏むね", 3],
      ["卵", 1],
    ]);
  });

  it("kcal / PFC は直近（先頭）の記録の値を採る", () => {
    const [candidate] = foldFoodCandidates([
      entry("鶏むね", { kcal: 220, protein_g: 45 }),
      entry("鶏むね", { kcal: 110, protein_g: 22 }),
    ]);

    expect(candidate).toMatchObject({ kcal: 220, count: 2 });
    expect(candidate?.macros.p).toBe(45);
  });

  it("前後の空白と英数の大小差を無視して同じ食品とみなす", () => {
    const candidates = foldFoodCandidates([
      entry("Protein"),
      entry(" protein "),
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ name: "Protein", count: 2 });
  });

  it("空の食品名は候補にしない", () => {
    expect(foldFoodCandidates([entry("  "), entry("卵")])).toHaveLength(1);
  });
});

describe("filterFoodCandidates", () => {
  const candidates = foldFoodCandidates([
    entry("プロテイン"),
    entry("鶏むね"),
    entry("鶏むね"),
    entry("蒸し鶏"),
  ]);

  it("空欄なら先頭から limit 件を返す", () => {
    expect(filterFoodCandidates(candidates, "", 2).map((c) => c.name)).toEqual([
      "鶏むね",
      "プロテイン",
    ]);
  });

  it("前方一致を部分一致より前に出す", () => {
    expect(
      filterFoodCandidates(candidates, "鶏", 8).map((c) => c.name),
    ).toEqual(["鶏むね", "蒸し鶏"]);
  });

  it("一致しなければ空", () => {
    expect(filterFoodCandidates(candidates, "サラダ", 8)).toEqual([]);
  });
});

describe("bumpFoodCandidate", () => {
  const candidates = foldFoodCandidates([entry("鶏むね"), entry("卵")]);

  it("既存の候補は回数を増やし、値を今回の入力で上書きする", () => {
    const next = bumpFoodCandidate(candidates, entry("鶏むね", { kcal: 330 }));

    expect(next[0]).toMatchObject({ name: "鶏むね", kcal: 330, count: 2 });
    expect(next).toHaveLength(2);
  });

  it("初めての食品は回数 1 で加わる", () => {
    const next = bumpFoodCandidate(candidates, entry("納豆"));

    expect(next).toHaveLength(3);
    expect(next.find((c) => c.name === "納豆")?.count).toBe(1);
  });

  it("空の食品名は無視する", () => {
    expect(bumpFoodCandidate(candidates, entry(" "))).toBe(candidates);
  });
});
