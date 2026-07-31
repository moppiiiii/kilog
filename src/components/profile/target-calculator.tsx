import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";

import {
  Card,
  Divider,
  HintCard,
  KpiCell,
  KpiStrip,
  MonoLabel,
  Pane,
  Panel,
  SectionTitle,
  SegmentedGroup,
  TopBar,
} from "@/components/kirog/console";
import { segmentClass } from "@/components/kirog/segment-class";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApplyNutritionTargets } from "@/hooks/use-apply-nutrition-targets";
import { dec } from "@/lib/format";
import { macroKcal, macroShare } from "@/lib/metrics";
import {
  ACTIVITY_LEVELS,
  calculateNutritionTargets,
  DIET_GOALS,
  missingTargetInputs,
  type NutritionTargets,
  type TargetBasisInput,
} from "@/lib/nutrition-targets";
import type { BodyLog } from "@/schemas/body";
import type {
  ActivityLevelValue,
  DietGoalValue,
  Profile,
  SexValue,
} from "@/schemas/profile";
import {
  TargetCalculatorFormSchema,
  type TargetCalculatorValues,
} from "@/schemas/profile";

// 目標カロリー / PFC を決めるページ。身長・体重・体脂肪率は既に記録済みのものを使い、
// 足りない前提（生年・性別・活動レベル・目標）だけをここで入力させる。
// 解説は読み物として独立させず、決める対象のすぐ隣に置く。

export function TargetCalculator({
  profile,
  body,
}: {
  profile: Profile;
  body: BodyLog;
}) {
  const applyTargets = useApplyNutritionTargets();

  const heightCm = Math.round(profile.heightM * 100);
  const weightKg = body.latest.weightKg;
  // 体組成の集計は未測定を 0 で埋めるため、0 は「未入力」として扱う。
  const bodyFatPct = body.latest.bodyFatPct > 0 ? body.latest.bodyFatPct : null;

  const form = useForm({
    defaultValues: {
      birth_year:
        profile.basis.birthYear === null ? "" : String(profile.basis.birthYear),
      sex: profile.basis.sex ?? "",
      activity_level: profile.basis.activityLevel ?? "moderate",
      diet_goal: profile.basis.dietGoal ?? "maintain",
    } satisfies TargetCalculatorValues,
    validators: { onSubmit: TargetCalculatorFormSchema },
    onSubmit: ({ value }) => {
      const targets = calculateNutritionTargets(
        toBasisInput(value, { heightCm, weightKg, bodyFatPct }),
      );
      if (targets === null) return;
      applyTargets.mutate({
        birth_year:
          value.birth_year.trim() === "" ? null : Number(value.birth_year),
        sex: value.sex === "" ? null : value.sex,
        activity_level: value.activity_level,
        diet_goal: value.diet_goal,
        target_kcal: targets.targetKcal,
        target_protein_g: targets.targetMacros.p,
        target_fat_g: targets.targetMacros.f,
        target_carb_g: targets.targetMacros.c,
      });
    },
  });

  return (
    <Panel>
      <TopBar>
        <div className="flex items-center gap-3.5">
          <Link
            to="/account"
            className="text-k-fg-dim hover:text-k-fg text-[13px]"
          >
            <span className="text-k-accent">◂</span> アカウント
          </Link>
          <span className="bg-k-edge h-4 w-px" />
          <span className="text-[15px] font-bold">目標カロリーと PFC</span>
        </div>
      </TopBar>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
        noValidate
      >
        <Pane className="space-y-6">
          <section>
            <SectionTitle className="mb-1.5">計算のもと</SectionTitle>
            <p className="text-k-fg-dim mb-3 text-xs">
              アカウントと体組成に記録済みの値を使います。ここを直すには元の画面で更新してください。
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <BasisFact
                label="身長"
                value={heightCm}
                unit="cm"
                to="/account"
              />
              <BasisFact label="体重" value={weightKg} unit="kg" to="/body" />
              <BasisFact
                label="体脂肪率"
                value={bodyFatPct}
                unit="%"
                to="/body"
                note="あると基礎代謝の精度が上がります"
              />
            </div>
          </section>

          <Divider />

          <section className="space-y-5">
            <div>
              <SectionTitle className="mb-1.5">前提を選ぶ</SectionTitle>
              <p className="text-k-fg-dim text-xs">
                生年と性別は、体脂肪率が未記録のときの基礎代謝の計算に使います。
              </p>
            </div>

            <div className="grid max-w-md grid-cols-2 gap-4">
              <form.Field name="birth_year">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={field.name}
                      className="text-k-fg-dim text-[11px]"
                    >
                      生年（西暦）
                    </Label>
                    <Input
                      id={field.name}
                      type="text"
                      inputMode="numeric"
                      placeholder="1990"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      aria-invalid={field.state.meta.errors.length > 0}
                      className="border-k-line-strong bg-k-well h-10 rounded-[9px] font-mono text-sm shadow-none"
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </div>
                )}
              </form.Field>

              <form.Field name="sex">
                {(field) => (
                  <div className="space-y-1.5">
                    <span className="text-k-fg-dim block text-[11px]">
                      性別
                    </span>
                    <SegmentedGroup className="rounded-[9px] p-1">
                      {SEX_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={field.state.value === option.value}
                          onClick={() => field.handleChange(option.value)}
                          className={segmentClass(
                            field.state.value === option.value,
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </SegmentedGroup>
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="activity_level">
              {(field) => (
                <fieldset className="space-y-2">
                  <legend className="text-k-fg-dim mb-2 text-[11px]">
                    活動レベル（基礎代謝に掛けて 1 日の消費カロリーにする）
                  </legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {ACTIVITY_KEYS.map((key) => (
                      <OptionRow
                        key={key}
                        name="activity-level"
                        selected={field.state.value === key}
                        onSelect={() => field.handleChange(key)}
                        label={ACTIVITY_LEVELS[key].label}
                        hint={ACTIVITY_LEVELS[key].hint}
                        badge={`×${String(ACTIVITY_LEVELS[key].factor)}`}
                      />
                    ))}
                  </div>
                </fieldset>
              )}
            </form.Field>

            <form.Field name="diet_goal">
              {(field) => (
                <fieldset className="space-y-2">
                  <legend className="text-k-fg-dim mb-2 text-[11px]">
                    目標
                  </legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {GOAL_KEYS.map((key) => (
                      <OptionRow
                        key={key}
                        name="diet-goal"
                        selected={field.state.value === key}
                        onSelect={() => field.handleChange(key)}
                        label={DIET_GOALS[key].label}
                        hint={DIET_GOALS[key].hint}
                        badge={`P ${String(DIET_GOALS[key].proteinPerKg)}g/kg`}
                      />
                    ))}
                  </div>
                </fieldset>
              )}
            </form.Field>
          </section>

          <Divider />

          <form.Subscribe selector={(state) => state.values}>
            {(values) => {
              const basis = toBasisInput(values, {
                heightCm,
                weightKg,
                bodyFatPct,
              });
              const targets = calculateNutritionTargets(basis);
              return targets === null ? (
                <MissingBasis missing={missingTargetInputs(basis)} />
              ) : (
                <ResultSection
                  targets={targets}
                  weightKg={weightKg}
                  dietGoal={values.diet_goal}
                  pending={applyTargets.isPending}
                  // 保存の成否ではなく「今の計算結果が保存済みの目標と一致するか」を見る。
                  // 保存後に条件を変えたら、そのまま未反映の表示へ戻る。
                  applied={matchesProfile(targets, profile)}
                  failed={applyTargets.isError}
                />
              );
            }}
          </form.Subscribe>

          <Divider />

          <PfcPrimer />
        </Pane>
      </form>
    </Panel>
  );
}

const SEX_OPTIONS = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
] as const satisfies ReadonlyArray<{ value: SexValue; label: string }>;

const ACTIVITY_KEYS = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const satisfies ReadonlyArray<ActivityLevelValue>;

const GOAL_KEYS = [
  "cut",
  "maintain",
  "bulk",
] as const satisfies ReadonlyArray<DietGoalValue>;

/** 計算結果が、いま保存されている目標値と同じか。 */
function matchesProfile(targets: NutritionTargets, profile: Profile): boolean {
  return (
    targets.targetKcal === profile.targetKcal &&
    targets.targetMacros.p === profile.targetMacros.p &&
    targets.targetMacros.f === profile.targetMacros.f &&
    targets.targetMacros.c === profile.targetMacros.c
  );
}

/** フォームの値と記録済みの実測値から、計算関数への入力を組む。 */
function toBasisInput(
  values: TargetCalculatorValues,
  measured: { heightCm: number; weightKg: number; bodyFatPct: number | null },
): TargetBasisInput {
  return {
    weightKg: measured.weightKg,
    heightCm: measured.heightCm,
    bodyFatPct: measured.bodyFatPct,
    birthYear:
      values.birth_year.trim() === "" ? null : Number(values.birth_year),
    sex: values.sex === "" ? null : values.sex,
    activityLevel: values.activity_level,
    dietGoal: values.diet_goal,
  };
}

/** 計算に使う実測値の 1 枚。未記録なら記録先へ誘導する。 */
function BasisFact({
  label,
  value,
  unit,
  to,
  note,
}: {
  label: string;
  value: number | null;
  unit: string;
  to: "/account" | "/body";
  note?: string;
}) {
  const recorded = value !== null && value > 0;
  return (
    <Card className="px-4 py-3">
      <MonoLabel>{label}</MonoLabel>
      {recorded ? (
        <div className="mt-1.5 flex items-baseline gap-1">
          <span className="font-mono text-[22px] leading-none font-semibold">
            {dec(value)}
          </span>
          <span className="text-k-fg-muted text-xs">{unit}</span>
        </div>
      ) : (
        <Link
          to={to}
          className="text-k-accent mt-1.5 inline-block text-[13px] hover:underline"
        >
          未記録 — 記録する
        </Link>
      )}
      {note ? <p className="text-k-fg-dim mt-1 text-[11px]">{note}</p> : null}
    </Card>
  );
}

/** 活動レベル / 目標の選択肢 1 行。ラジオとして読み上げられるようにする。 */
function OptionRow({
  name,
  selected,
  onSelect,
  label,
  hint,
  badge,
}: {
  name: string;
  selected: boolean;
  onSelect: () => void;
  label: string;
  hint: string;
  badge: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 rounded-[10px] border px-3.5 py-2.5 transition-colors ${
        selected
          ? "border-k-accent-edge bg-k-accent-bg"
          : "border-k-line bg-k-raised hover:border-k-line-strong"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={selected}
        onChange={onSelect}
        className="accent-k-accent mt-1 shrink-0"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium">{label}</span>
          <span className="text-k-fg-dim shrink-0 font-mono text-[11px]">
            {badge}
          </span>
        </span>
        <span className="text-k-fg-dim mt-0.5 block text-[11px]">{hint}</span>
      </span>
    </label>
  );
}

/** 前提が足りず計算できないときの案内。 */
function MissingBasis({ missing }: { missing: string[] }) {
  return (
    <section>
      <SectionTitle className="mb-3">計算結果</SectionTitle>
      <HintCard>
        <p className="text-[13px] font-bold">まだ計算できません</p>
        <p className="text-k-fg-sub mt-1.5 text-xs">
          次の情報が足りません: {missing.join(" / ")}
        </p>
        <p className="text-k-fg-dim mt-2 text-[11px]">
          体脂肪率を記録すると、生年・性別なしでも基礎代謝を計算できます（除脂肪体重ベースの
          Katch-McArdle 式）。
        </p>
      </HintCard>
    </section>
  );
}

/** 計算結果と、それを目標として保存するボタン。 */
function ResultSection({
  targets,
  weightKg,
  dietGoal,
  pending,
  applied,
  failed,
}: {
  targets: NutritionTargets;
  weightKg: number;
  dietGoal: DietGoalValue;
  pending: boolean;
  /** この結果が既に目標として保存済みか。 */
  applied: boolean;
  failed: boolean;
}) {
  const goal = DIET_GOALS[dietGoal];
  const [pShare, fShare, cShare] = macroShare(targets.targetMacros);

  return (
    <section>
      <SectionTitle className="mb-3">計算結果</SectionTitle>

      <Card className="mb-4">
        <KpiStrip className="border-b-0">
          <KpiCell
            label="基礎代謝"
            value={targets.bmrKcal}
            unit="kcal"
            foot={
              targets.method === "katch-mcardle"
                ? "Katch-McArdle（除脂肪体重ベース）"
                : "Mifflin-St Jeor（年齢・性別ベース）"
            }
          />
          <KpiCell
            label="1日の消費"
            value={targets.tdeeKcal}
            unit="kcal"
            foot="基礎代謝 × 活動レベル"
          />
          <KpiCell
            label="目標カロリー"
            value={targets.targetKcal}
            unit="kcal"
            valueClassName="text-k-accent"
            foot={`消費の ${String(Math.round(goal.kcalRate * 100))}%（${goal.label}）`}
          />
          <KpiCell
            label="PFC の合計"
            value={Math.round(macroKcal(targets.targetMacros))}
            unit="kcal"
            foot="丸めの分だけ目標とずれます"
          />
        </KpiStrip>
      </Card>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <MacroCard
          letter="P"
          name="タンパク質"
          grams={targets.targetMacros.p}
          share={pShare}
          why={`体重 ${dec(weightKg)}kg × ${String(goal.proteinPerKg)}g。筋肉を保つ土台で、${goal.label}中も最優先で確保する`}
        />
        <MacroCard
          letter="F"
          name="脂質"
          grams={targets.targetMacros.f}
          share={fShare}
          why="総カロリーの 25%。ホルモンの材料になるので、減量中でもここは削りすぎない"
        />
        <MacroCard
          letter="C"
          name="炭水化物"
          grams={targets.targetMacros.c}
          share={cShare}
          why="P と F を引いた残り。トレーニングの出力に直結する調整枠"
        />
      </div>

      {targets.flooredAtBmr ? (
        <p className="text-k-warn mt-3 text-xs">
          減量幅が基礎代謝を下回ったため、基礎代謝の値まで引き上げています。
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={pending || applied}
          className="rounded-[9px] font-bold"
        >
          {pending ? "保存中…" : "この値を目標にする"}
        </Button>
        {applied ? (
          <span className="text-k-success text-xs">この値が現在の目標です</span>
        ) : (
          <span className="text-k-fg-dim text-xs">
            アカウントの目標値を上書きします
          </span>
        )}
        {failed ? (
          <span className="text-k-danger text-xs">保存に失敗しました</span>
        ) : null}
      </div>
    </section>
  );
}

function MacroCard({
  letter,
  name,
  grams,
  share,
  why,
}: {
  letter: string;
  name: string;
  grams: number;
  share: number;
  why: string;
}) {
  return (
    <Card className="px-4 py-3.5">
      <div className="flex items-baseline gap-2">
        <span className="text-k-accent font-mono text-[13px] font-bold">
          {letter}
        </span>
        <span className="text-[13px] font-medium">{name}</span>
        <span className="text-k-fg-dim ml-auto font-mono text-[11px]">
          {share}%
        </span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="font-mono text-[26px] leading-none font-semibold">
          {grams}
        </span>
        <span className="text-k-fg-muted text-xs">g</span>
      </div>
      <p className="text-k-fg-dim mt-2 text-[11px] leading-relaxed">{why}</p>
    </Card>
  );
}

/** PFC そのものの説明。計算の後ろに置き、結果を読み解くための補足にする。 */
function PfcPrimer() {
  return (
    <section className="space-y-3">
      <SectionTitle>PFC とダイエットの関係</SectionTitle>
      <dl className="space-y-3 text-xs leading-relaxed">
        {PRIMER_ITEMS.map((item) => (
          <div key={item.term}>
            <dt className="text-k-fg text-[13px] font-medium">{item.term}</dt>
            <dd className="text-k-fg-sub mt-0.5">{item.body}</dd>
          </div>
        ))}
      </dl>
      <p className="text-k-fg-dim text-[11px]">
        ここに出る数字は一般的な目安です。持病がある場合や大幅な減量を行う場合は、医師・管理栄養士に相談してください。
      </p>
    </section>
  );
}

const PRIMER_ITEMS = [
  {
    term: "PFC とは",
    body: "タンパク質（Protein）・脂質（Fat）・炭水化物（Carbohydrate）の三大栄養素。1g あたり P は 4kcal、F は 9kcal、C は 4kcal で、この 3 つの合計が総カロリーになります。",
  },
  {
    term: "体重を動かすのはカロリー、体組成を決めるのが PFC",
    body: "増減の向きは消費と摂取の差で決まります。同じ 1,800kcal でも PFC の配分次第で、落ちるのが脂肪か筋肉かが変わります。まずカロリー、次に配分の順で考えます。",
  },
  {
    term: "減量中こそタンパク質",
    body: "カロリーが不足すると体は筋肉も分解し始めます。体重 1kg あたり 2g 前後を確保すると筋肉の減少を抑えられ、代謝が落ちにくくなります。",
  },
  {
    term: "脂質を削りすぎない",
    body: "脂質はホルモンの材料で、脂溶性ビタミンの吸収にも要ります。総カロリーの 20〜25% を下回らない範囲に置き、減量の調整は主に炭水化物で行います。",
  },
  {
    term: "炭水化物は調整枠",
    body: "P と F を決めた残りが C になります。トレーニングの出力に直結するので、削りすぎると練習の質が落ちて結果的に減量が停滞します。",
  },
] as const;

function FieldError({
  errors,
}: {
  errors: ReadonlyArray<{ message?: string } | undefined>;
}) {
  if (errors.length === 0) return null;
  return (
    <p className="text-k-danger text-xs" role="alert">
      {errors.flatMap((e) => (e?.message ? [e.message] : [])).join(", ")}
    </p>
  );
}
