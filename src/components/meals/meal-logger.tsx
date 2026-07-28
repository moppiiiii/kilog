import { useForm } from "@tanstack/react-form";
import type { QueryKey } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import type * as React from "react";
import { useState } from "react";

import {
  Card,
  DashedAction,
  Divider,
  Meter,
  MonoLabel,
  Pane,
  Panel,
  PanelTitle,
  SectionTitle,
  SplitBody,
  TopBar,
} from "@/components/kirog/console";
import { SlotBadge, SLOT_COLOR } from "@/components/meals/slot-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAddMealEntry } from "@/hooks/use-add-meal-entry";
import { useRemoveMealEntry } from "@/hooks/use-remove-meal-entry";
import { useUpdateMealEntry } from "@/hooks/use-update-meal-entry";
import { addDaysIso, dec, stampDate, todayIso } from "@/lib/format";
import { dayKcal, dayMacros, groupKcal, groupMacros, pct } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type {
  DailyMeals,
  FoodSuggestion,
  ManualMealEntryValue,
  MealItem,
  MealSlotValue,
} from "@/schemas/meals";
import { ManualMealEntryInput, ManualMealFormSchema } from "@/schemas/meals";

// 5A: 食事の記録画面。食品検索と PFC 集計。

export function MealLogger({
  data,
  queryKey,
}: {
  data: DailyMeals;
  /** 購読中の日のキャッシュキー（当日 or /meals/$date）。楽観更新の対象。 */
  queryKey?: QueryKey;
}) {
  const navigate = useNavigate();
  const addEntry = useAddMealEntry(queryKey);
  const updateEntry = useUpdateMealEntry(queryKey);
  const removeEntry = useRemoveMealEntry(queryKey);
  // 追加UIを開いているスロット（null=すべて閉じている）。追加先は開いたカード＝そのスロットで自明。
  const [openSlot, setOpenSlot] = useState<MealSlotValue | null>(null);
  /** 編集中の 1 品（null=編集していない）。 */
  const [editingId, setEditingId] = useState<string | null>(null);

  const addFood = (slot: MealSlotValue, food: FoodSuggestion) =>
    addEntry.mutate({
      date: data.date,
      slot,
      name: food.name,
      qty: "",
      kcal: food.kcal,
      protein_g: food.macros.p,
      fat_g: food.macros.f,
      carb_g: food.macros.c,
      food_id: food.id,
      position: 0,
    });

  // 手入力（任意の食品）。DB 未登録なので food_id は null で記録する。
  const addManual = (slot: MealSlotValue, value: ManualMealEntryValue) =>
    addEntry.mutate({
      ...value,
      date: data.date,
      slot,
      food_id: null,
      position: 0,
    });

  const today = todayIso();
  const totalKcal = dayKcal(data.groups);
  const totals = dayMacros(data.groups);

  const macroRows = [
    {
      label: "タンパク質",
      value: totals.p,
      target: data.targetMacros.p,
      bar: "bg-k-accent",
      text: "text-k-accent",
    },
    {
      label: "脂質",
      value: totals.f,
      target: data.targetMacros.f,
      bar: "bg-k-success",
      text: "text-k-success",
    },
    {
      label: "炭水化物",
      value: totals.c,
      target: data.targetMacros.c,
      bar: "bg-k-warn",
      text: "text-k-warn",
    },
  ];

  return (
    <Panel>
      <TopBar>
        <PanelTitle sub={data.date === today ? undefined : "過去日の記録"}>
          食事を記録
        </PanelTitle>
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <div className="border-k-line bg-k-raised text-k-fg-sub flex items-center gap-2 rounded-[9px] border px-3.5 py-1.5 font-mono text-[13px]">
            <DayLink date={addDaysIso(data.date, -1)} label="前日へ">
              ◂
            </DayLink>
            {stampDate(data.date)}
            {/* 未来の日付は記録しないので、当日より先へは進めない。 */}
            {addDaysIso(data.date, 1) <= today ? (
              <DayLink date={addDaysIso(data.date, 1)} label="翌日へ">
                ▸
              </DayLink>
            ) : (
              <span className="text-k-fg-faint" aria-hidden>
                ▸
              </span>
            )}
          </div>
          <Button
            size="sm"
            className="rounded-[9px] font-bold"
            onClick={() => navigate({ to: "/" })}
          >
            記録を確定
          </Button>
        </div>
      </TopBar>

      <SplitBody className="lg:[grid-template-columns:1.55fr_1fr]">
        <Pane className="flex flex-col gap-4">
          {data.groups.map((group) => {
            const macros = groupMacros(group);
            return (
              <Card key={group.slot}>
                <div className="border-k-line flex items-center gap-3 border-b px-4.5 py-3.5">
                  <SlotBadge slot={group.slot} />
                  <span className="flex-1 text-[15px] font-bold">
                    {group.name}
                  </span>
                  <span className="text-k-fg-sub font-mono text-[13px]">
                    {dec(groupKcal(group))}{" "}
                    <span className="text-k-fg-dim text-[11px]">kcal</span>
                  </span>
                  <span className="text-k-fg-dim w-[120px] text-right font-mono text-[11px]">
                    P{dec(macros.p)} F{dec(macros.f)} C{dec(macros.c)}
                  </span>
                </div>

                {group.items.map((item) =>
                  editingId === item.id ? (
                    <div
                      key={item.id}
                      className="border-k-line-soft bg-k-well/40 border-b px-4.5 py-3.5"
                    >
                      <MonoLabel className="mb-2.5">1品を修正</MonoLabel>
                      <ManualEntryForm
                        submitLabel="保存"
                        initial={toFormValues(item)}
                        disabled={updateEntry.isPending}
                        onSubmitValue={(value) => {
                          updateEntry.mutate({ id: item.id, ...value });
                          setEditingId(null);
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    </div>
                  ) : (
                    <div
                      key={item.id}
                      className="border-k-line-soft grid grid-cols-[1fr_78px_96px_64px] items-center gap-3 border-b px-4.5 py-2.5"
                    >
                      <div className="text-k-fg truncate text-[13px] font-medium">
                        {item.name}
                      </div>
                      <div className="text-k-fg-sub font-mono text-[13px]">
                        {item.qty}
                      </div>
                      <div className="text-k-fg-sub text-right font-mono text-[13px] whitespace-nowrap">
                        {dec(item.kcal)}
                        <span className="text-k-fg-dim ml-0.5 text-[11px]">
                          kcal
                        </span>
                      </div>
                      <div className="flex justify-end gap-1.5">
                        {/* 楽観追加中（temp- id）は行がまだ確定していないので編集させない。 */}
                        {item.id.startsWith("temp-") ? null : (
                          <button
                            type="button"
                            onClick={() => setEditingId(item.id)}
                            aria-label={`${item.name} を編集`}
                            className="text-k-fg-faint hover:text-k-accent text-sm transition-colors"
                          >
                            ✎
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeEntry.mutate(item.id)}
                          aria-label={`${item.name} を削除`}
                          className="text-k-fg-faint hover:text-k-danger text-sm transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ),
                )}

                <div className="px-4.5 py-3.5">
                  {openSlot === group.slot ? (
                    <div className="border-k-line bg-k-well/40 flex flex-col gap-4 rounded-xl border p-3.5">
                      <div className="flex items-center justify-between">
                        <MonoLabel>{group.name}に追加</MonoLabel>
                        <button
                          type="button"
                          onClick={() => setOpenSlot(null)}
                          className="text-k-fg-faint hover:text-k-fg text-xs"
                        >
                          閉じる
                        </button>
                      </div>

                      <ManualEntryForm
                        submitLabel={`${group.name}に追加`}
                        disabled={addEntry.isPending}
                        onSubmitValue={(value) => addManual(group.slot, value)}
                      />

                      <div>
                        <MonoLabel className="mb-2.5">よく食べる</MonoLabel>
                        <div className="flex flex-col gap-2">
                          {data.suggestions.map((food) => (
                            <SuggestionRow
                              key={food.id}
                              food={food}
                              slotName={group.name}
                              onAdd={() => addFood(group.slot, food)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <DashedAction
                      className="rounded-lg p-2.5 text-xs"
                      onClick={() => setOpenSlot(group.slot)}
                    >
                      ＋ {group.name}に食品を追加
                    </DashedAction>
                  )}
                </div>
              </Card>
            );
          })}
        </Pane>

        <Pane className="flex flex-col gap-5.5">
          <div>
            <SectionTitle
              right={
                <span className="text-k-success font-mono text-xs">
                  残り {dec(data.targetKcal - totalKcal)} kcal
                </span>
              }
            >
              本日の合計
            </SectionTitle>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[38px] font-bold">
                {dec(totalKcal)}
              </span>
              <span className="text-k-fg-muted text-sm">
                / {dec(data.targetKcal)} kcal
              </span>
            </div>
            <Meter
              value={pct(totalKcal, data.targetKcal)}
              className="mt-3 h-[9px]"
              barClassName="bg-[linear-gradient(90deg,#5b8bff,#4fd39a)]"
            />
          </div>

          <div className="flex flex-col gap-3.5">
            {macroRows.map((row) => (
              <div key={row.label}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[13px]">{row.label}</span>
                  <span className="text-k-fg-dim font-mono text-xs">
                    {dec(row.value)}g / {dec(row.target)}g{" "}
                    <span className={row.text}>
                      {Math.round(pct(row.value, row.target))}%
                    </span>
                  </span>
                </div>
                <Meter
                  value={pct(row.value, row.target)}
                  className="h-[7px]"
                  barClassName={row.bar}
                />
              </div>
            ))}
          </div>

          <Divider />

          <div>
            <SectionTitle className="mb-3">食事別の内訳</SectionTitle>
            <div className="bg-k-line mb-4 flex h-2.5 overflow-hidden rounded-full">
              {data.groups.map((group) => {
                const width =
                  totalKcal > 0 ? (groupKcal(group) / totalKcal) * 100 : 0;
                return width > 0 ? (
                  <div
                    key={group.slot}
                    className={SLOT_COLOR[group.slot]}
                    style={{ width: `${width}%` }}
                  />
                ) : null;
              })}
            </div>
            <div className="flex flex-col gap-2.5">
              {data.groups.map((group) => {
                const kcal = groupKcal(group);
                const share =
                  totalKcal > 0 ? Math.round((kcal / totalKcal) * 100) : 0;
                return (
                  <div key={group.slot} className="flex items-center gap-3">
                    <SlotBadge
                      slot={group.slot}
                      className="size-6 rounded-md"
                      iconClassName="size-3.5"
                    />
                    <span className="flex-1 text-[13px]">{group.name}</span>
                    <span className="text-k-fg-sub font-mono text-[13px]">
                      {dec(kcal)}
                      <span className="text-k-fg-dim ml-0.5 text-[11px]">
                        kcal
                      </span>
                    </span>
                    <span className="text-k-fg-dim w-9 text-right font-mono text-[11px]">
                      {share}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Pane>
      </SplitBody>
    </Panel>
  );
}

/** 前後の日へ移動する 1 マス。当日は正規 URL の /meals、それ以外は /meals/$date を指す。 */
function DayLink({
  date,
  label,
  children,
}: {
  date: string;
  label: string;
  children: React.ReactNode;
}) {
  const className = "text-k-accent hover:text-k-fg transition-colors";
  return date === todayIso() ? (
    <Link to="/meals" aria-label={label} className={className}>
      {children}
    </Link>
  ) : (
    <Link
      to="/meals/$date"
      params={{ date }}
      aria-label={label}
      className={className}
    >
      {children}
    </Link>
  );
}

/** よく食べる候補の 1 行。開いているスロットへ「＋」で追加する。 */
function SuggestionRow({
  food,
  slotName,
  onAdd,
}: {
  food: FoodSuggestion;
  slotName: string;
  onAdd: () => void;
}) {
  return (
    <div className="border-k-line bg-k-raised flex items-center gap-3 rounded-[10px] border px-3.5 py-2.5">
      <span className="bg-k-chip text-k-fg-dim flex size-[34px] shrink-0 items-center justify-center rounded-lg font-mono text-[10px]">
        {food.tag}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">{food.name}</div>
        <div className="text-k-fg-dim text-[11px]">
          P{food.macros.p} F{food.macros.f} C{food.macros.c}
        </div>
      </div>
      <span className="text-k-fg-sub font-mono text-[13px]">
        {dec(food.kcal)}
      </span>
      <button
        type="button"
        onClick={onAdd}
        aria-label={`${food.name} を ${slotName} に追加`}
        className="bg-k-accent-bg text-k-accent-soft flex size-6.5 shrink-0 items-center justify-center rounded-[7px] text-[15px]"
      >
        ＋
      </button>
    </div>
  );
}

const FIELD_CLASS =
  "border-k-line-strong bg-k-well h-10 rounded-[9px] text-sm shadow-none";

/** 手入力フォームの値（すべて文字列で保持する）。 */
type ManualFormValues = {
  name: string;
  qty: string;
  kcal: string;
  protein_g: string;
  fat_g: string;
  carb_g: string;
};

const EMPTY_FORM: ManualFormValues = {
  name: "",
  qty: "",
  kcal: "",
  protein_g: "",
  fat_g: "",
  carb_g: "",
};

/** 記録済みの 1 品を編集フォームの初期値へ。数値は文字列にして渡す。 */
function toFormValues(item: MealItem): ManualFormValues {
  return {
    name: item.name,
    qty: item.qty,
    kcal: String(item.kcal),
    protein_g: String(item.macros.p),
    fat_g: String(item.macros.f),
    carb_g: String(item.macros.c),
  };
}

/**
 * 食品を手入力するフォーム。追加（空の初期値）と修正（既存値の初期値）で共用する。
 * 検証は schemas/meals の zod を共有し、送信は親（MealLogger）へ委譲する。
 * date / slot / food_id は親が文脈で補う。
 */
function ManualEntryForm({
  submitLabel,
  disabled,
  initial,
  onSubmitValue,
  onCancel,
}: {
  submitLabel: string;
  disabled?: boolean;
  initial?: ManualFormValues;
  onSubmitValue: (value: ManualMealEntryValue) => void;
  onCancel?: () => void;
}) {
  // 入力欄は文字列で保持（小数の途中入力を壊さない）。送信時に zod で数値へ coerce する。
  const form = useForm({
    defaultValues: initial ?? EMPTY_FORM,
    validators: { onSubmit: ManualMealFormSchema },
    onSubmit: ({ value, formApi }) => {
      // 文字列フォーム値を数値へ coerce して親へ渡す（検証は上の schema で済み）。
      onSubmitValue(ManualMealEntryInput.parse(value));
      formApi.reset();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-2.5"
      noValidate
    >
      <div className="grid grid-cols-[1fr_88px] gap-2">
        <form.Field name="name">
          {(field) => (
            <div>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="食品名"
                aria-label="食品名"
                aria-invalid={field.state.meta.errors.length > 0}
                className={FIELD_CLASS}
              />
              <FieldError errors={field.state.meta.errors} />
            </div>
          )}
        </form.Field>
        <form.Field name="qty">
          {(field) => (
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="量"
              aria-label="量（例: 150 g）"
              className={FIELD_CLASS}
            />
          )}
        </form.Field>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {NUMBER_FIELDS.map((f) => (
          <form.Field key={f.name} name={f.name}>
            {(field) => (
              <Input
                type="text"
                inputMode="decimal"
                // 文字列のまま保持し、そのまま表示（"0.2" が ".2" にならない）。
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={f.label}
                aria-label={f.label}
                className={cn(FIELD_CLASS, "px-2.5 text-center font-mono")}
              />
            )}
          </form.Field>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={disabled}
          className="flex-1 rounded-[9px] font-bold"
        >
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onCancel}
            className="rounded-[9px]"
          >
            キャンセル
          </Button>
        ) : null}
      </div>
    </form>
  );
}

// kcal / PFC の数値フィールド定義。入力は文字列、空欄は送信時に 0 扱い。
const NUMBER_FIELDS = [
  { name: "kcal", label: "kcal" },
  { name: "protein_g", label: "P (g)" },
  { name: "fat_g", label: "F (g)" },
  { name: "carb_g", label: "C (g)" },
] as const;

/** フィールド検証エラー（zod issue）を 1 行で表示する。 */
function FieldError({
  errors,
}: {
  errors: ReadonlyArray<{ message?: string } | undefined>;
}) {
  if (errors.length === 0) return null;
  return (
    <p className="text-k-danger mt-1 text-xs" role="alert">
      {errors
        .map((e) => e?.message)
        .filter(Boolean)
        .join(", ")}
    </p>
  );
}
