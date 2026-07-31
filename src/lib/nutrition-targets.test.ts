import { describe, expect, it } from "vitest";

import {
  ACTIVITY_LEVELS,
  calculateNutritionTargets,
  katchMcArdleBmr,
  mifflinStJeorBmr,
  missingTargetInputs,
  type TargetBasisInput,
} from "./nutrition-targets";

const basis = (
  overrides: Partial<TargetBasisInput> = {},
): TargetBasisInput => ({
  weightKg: 70,
  heightCm: 175,
  bodyFatPct: 15,
  birthYear: 1990,
  sex: "male",
  activityLevel: "moderate",
  dietGoal: "maintain",
  currentYear: 2026,
  ...overrides,
});

describe("基礎代謝の式", () => {
  it("Katch-McArdle は除脂肪体重から出す", () => {
    expect(katchMcArdleBmr(59.5)).toBeCloseTo(370 + 21.6 * 59.5);
  });

  it("Mifflin-St Jeor は性別で定数が変わる", () => {
    const input = { weightKg: 70, heightCm: 175, age: 36 };
    expect(mifflinStJeorBmr({ ...input, sex: "male" })).toBe(
      mifflinStJeorBmr({ ...input, sex: "female" }) + 166,
    );
  });
});

describe("calculateNutritionTargets", () => {
  it("体脂肪率があれば Katch-McArdle を使う", () => {
    const result = calculateNutritionTargets(basis());

    expect(result?.method).toBe("katch-mcardle");
    // 70kg・体脂肪 15% → 除脂肪 59.5kg
    expect(result?.bmrKcal).toBe(Math.round(katchMcArdleBmr(59.5)));
  });

  it("体脂肪率が無ければ生年・性別から Mifflin-St Jeor に落ちる", () => {
    const result = calculateNutritionTargets(basis({ bodyFatPct: null }));

    expect(result?.method).toBe("mifflin-st-jeor");
    expect(result?.bmrKcal).toBe(
      Math.round(
        mifflinStJeorBmr({
          weightKg: 70,
          heightCm: 175,
          age: 36,
          sex: "male",
        }),
      ),
    );
  });

  it("消費カロリーは基礎代謝 × 活動レベルの係数", () => {
    const result = calculateNutritionTargets(basis({ activityLevel: "light" }));

    expect(result?.tdeeKcal).toBe(
      Math.round((result?.bmrKcal ?? 0) * ACTIVITY_LEVELS.light.factor),
    );
  });

  it("減量 < 維持 < 増量 の順に目標カロリーが増える", () => {
    const kcal = (dietGoal: TargetBasisInput["dietGoal"]) =>
      calculateNutritionTargets(basis({ dietGoal }))?.targetKcal ?? 0;

    expect(kcal("cut")).toBeLessThan(kcal("maintain"));
    expect(kcal("maintain")).toBeLessThan(kcal("bulk"));
  });

  it("PFC の合計カロリーが目標カロリーとほぼ一致する（丸め分のみ）", () => {
    const result = calculateNutritionTargets(basis());
    const macros = result?.targetMacros;
    const total =
      (macros?.p ?? 0) * 4 + (macros?.f ?? 0) * 9 + (macros?.c ?? 0) * 4;

    expect(Math.abs(total - (result?.targetKcal ?? 0))).toBeLessThanOrEqual(4);
  });

  it("タンパク質は体重 × 目標ごとの係数", () => {
    // 減量は 2.2g/kg → 70kg で 154g
    expect(
      calculateNutritionTargets(basis({ dietGoal: "cut" }))?.targetMacros.p,
    ).toBe(154);
  });

  it("体脂肪率も生年・性別も無ければ計算しない", () => {
    const input = basis({ bodyFatPct: null, birthYear: null, sex: null });

    expect(calculateNutritionTargets(input)).toBeNull();
    expect(missingTargetInputs(input)).toEqual(["生年", "性別"]);
  });

  it("体重が未記録なら計算しない", () => {
    const input = basis({ weightKg: 0 });

    expect(calculateNutritionTargets(input)).toBeNull();
    expect(missingTargetInputs(input)).toContain("体重（体組成ページで記録）");
  });

  it("体脂肪率があれば生年・性別が無くても計算できる", () => {
    const input = basis({ birthYear: null, sex: null });

    expect(missingTargetInputs(input)).toEqual([]);
    expect(calculateNutritionTargets(input)?.method).toBe("katch-mcardle");
  });
});
