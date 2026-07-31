import type { Macros } from "@/schemas/meals";
import type {
  ActivityLevelValue,
  DietGoalValue,
  SexValue,
} from "@/schemas/profile";

// 目標カロリー / PFC の計算。基礎代謝 → 消費カロリー → 目標カロリー → PFC の順に落とす。
// 一般的な目安であって医療上の指示ではない（画面側でもその旨を出す）。
// 係数と式はここに集約し、計算ページと体組成ページ（基礎代謝）で同じものを使う。

/** 活動レベル。係数は基礎代謝に掛けて 1 日の消費カロリーにする。 */
export const ACTIVITY_LEVELS: Record<
  ActivityLevelValue,
  { label: string; hint: string; factor: number }
> = {
  sedentary: {
    label: "ほぼ運動なし",
    hint: "デスクワーク中心・運動は週 0〜1 回",
    factor: 1.2,
  },
  light: {
    label: "軽い運動",
    hint: "週 1〜2 回のトレーニング",
    factor: 1.375,
  },
  moderate: {
    label: "中程度",
    hint: "週 3〜5 回のトレーニング",
    factor: 1.55,
  },
  active: {
    label: "活動的",
    hint: "週 6〜7 回のトレーニング",
    factor: 1.725,
  },
  very_active: {
    label: "非常に活動的",
    hint: "毎日の高強度トレーニング・肉体労働",
    factor: 1.9,
  },
};

/** 目標。消費カロリーへの倍率と、タンパク質の目安（体重 1kg あたり g）を持つ。 */
export const DIET_GOALS: Record<
  DietGoalValue,
  { label: string; hint: string; kcalRate: number; proteinPerKg: number }
> = {
  cut: {
    label: "減量",
    hint: "消費より 15% 少なく。筋肉を守るためタンパク質を最も高く取る",
    kcalRate: 0.85,
    proteinPerKg: 2.2,
  },
  maintain: {
    label: "維持",
    hint: "消費と同じ。体重を保ったまま体組成を変える",
    kcalRate: 1,
    proteinPerKg: 1.8,
  },
  bulk: {
    label: "増量",
    hint: "消費より 10% 多く。脂肪を増やしすぎない範囲の上乗せ",
    kcalRate: 1.1,
    proteinPerKg: 2,
  },
};

/**
 * 総カロリーに占める脂質の割合。ホルモン合成や脂溶性ビタミンの吸収に要る分があるため、
 * 減量中でもここを下回らないようにする（残りを炭水化物へ回す）。
 */
const FAT_KCAL_SHARE = 0.25;

/** 1g あたりのカロリー。 */
const KCAL_PER_G = { protein: 4, fat: 9, carb: 4 } as const;

/** Katch-McArdle（除脂肪体重ベース）。体脂肪率が分かるときはこちらを使う。 */
export function katchMcArdleBmr(leanKg: number): number {
  return 370 + 21.6 * leanKg;
}

/** Mifflin-St Jeor（体重・身長・年齢・性別ベース）。体脂肪率が無いときの代替。 */
export function mifflinStJeorBmr(input: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: SexValue;
}): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return input.sex === "male" ? base + 5 : base - 161;
}

export type TargetBasisInput = {
  weightKg: number;
  heightCm: number;
  /** 直近の測定値。無ければ Mifflin-St Jeor に落ちる。 */
  bodyFatPct: number | null;
  birthYear: number | null;
  sex: SexValue | null;
  activityLevel: ActivityLevelValue;
  dietGoal: DietGoalValue;
  /** 年齢を出す基準年（既定は今年）。 */
  currentYear?: number;
};

export type NutritionTargets = {
  /** 基礎代謝に使った式。画面で根拠として示す。 */
  method: "katch-mcardle" | "mifflin-st-jeor";
  bmrKcal: number;
  /** 活動レベルまで掛けた 1 日の消費カロリー（TDEE）。 */
  tdeeKcal: number;
  targetKcal: number;
  targetMacros: Macros;
  /** 減量幅が基礎代謝を割り込んだため引き上げたか。 */
  flooredAtBmr: boolean;
};

/** 体脂肪率が無く、年齢か性別も無いと基礎代謝を出せない。足りない前提を挙げる。 */
export function missingTargetInputs(input: TargetBasisInput): string[] {
  const missing: string[] = [];
  if (input.weightKg <= 0) missing.push("体重（体組成ページで記録）");
  if (input.bodyFatPct == null) {
    if (input.heightCm <= 0) missing.push("身長");
    if (input.birthYear == null) missing.push("生年");
    if (input.sex == null) missing.push("性別");
  }
  return missing;
}

/**
 * 前提から目標カロリーと PFC を出す。足りない前提があれば null
 * （何が足りないかは missingTargetInputs が返す）。
 */
export function calculateNutritionTargets(
  input: TargetBasisInput,
): NutritionTargets | null {
  const basal = basalMetabolicRate(input);
  if (basal === null || input.weightKg <= 0) return null;

  const { bmrKcal, method } = basal;
  const tdeeKcal = bmrKcal * ACTIVITY_LEVELS[input.activityLevel].factor;

  const goal = DIET_GOALS[input.dietGoal];
  const adjusted = tdeeKcal * goal.kcalRate;
  // 基礎代謝を下回る目標は置かない（減量でもここが下限）。
  const flooredAtBmr = adjusted < bmrKcal;
  const targetKcal = Math.round(flooredAtBmr ? bmrKcal : adjusted);

  // P は体重から決め、F は総カロリーの一定割合、C が残り。
  const p = Math.round(input.weightKg * goal.proteinPerKg);
  const f = Math.round((targetKcal * FAT_KCAL_SHARE) / KCAL_PER_G.fat);
  const remaining = targetKcal - p * KCAL_PER_G.protein - f * KCAL_PER_G.fat;
  const c = Math.max(0, Math.round(remaining / KCAL_PER_G.carb));

  return {
    method,
    bmrKcal: Math.round(bmrKcal),
    tdeeKcal: Math.round(tdeeKcal),
    targetKcal,
    targetMacros: { p, f, c },
    flooredAtBmr,
  };
}

/** 体脂肪率があれば Katch-McArdle、無ければ Mifflin-St Jeor。どちらも組めなければ null。 */
function basalMetabolicRate(
  input: TargetBasisInput,
): { bmrKcal: number; method: NutritionTargets["method"] } | null {
  if (input.bodyFatPct != null) {
    const leanKg = input.weightKg * (1 - input.bodyFatPct / 100);
    return { bmrKcal: katchMcArdleBmr(leanKg), method: "katch-mcardle" };
  }
  if (input.birthYear == null || input.sex == null || input.heightCm <= 0) {
    return null;
  }
  const currentYear = input.currentYear ?? new Date().getFullYear();
  return {
    bmrKcal: mifflinStJeorBmr({
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      age: currentYear - input.birthYear,
      sex: input.sex,
    }),
    method: "mifflin-st-jeor",
  };
}
