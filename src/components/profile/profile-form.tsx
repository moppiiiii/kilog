import { useForm } from "@tanstack/react-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSaveProfile } from "@/hooks/use-save-profile";
import {
  type Profile,
  ProfileFormSchema,
  UpdateProfileInput,
} from "@/schemas/profile";

// 身長・目標値の編集フォーム。値は文字列で保持し、送信時に zod で数値へ coerce する。
// 検証は schemas/profile の ProfileFormSchema を共有する。

const FIELDS = [
  { name: "height_cm", label: "身長", unit: "cm" },
  { name: "target_weight_kg", label: "目標体重", unit: "kg" },
  { name: "target_kcal", label: "目標カロリー", unit: "kcal" },
  { name: "target_protein_g", label: "目標タンパク質", unit: "g" },
  { name: "target_fat_g", label: "目標脂質", unit: "g" },
  { name: "target_carb_g", label: "目標炭水化物", unit: "g" },
] as const;

export function ProfileForm({ profile }: { profile: Profile }) {
  const saveProfile = useSaveProfile();

  const form = useForm({
    defaultValues: {
      height_cm: String(Math.round(profile.heightM * 100)),
      target_weight_kg: String(profile.targetWeightKg),
      target_kcal: String(profile.targetKcal),
      target_protein_g: String(profile.targetMacros.p),
      target_fat_g: String(profile.targetMacros.f),
      target_carb_g: String(profile.targetMacros.c),
    },
    validators: { onSubmit: ProfileFormSchema },
    onSubmit: ({ value }) =>
      saveProfile.mutate(UpdateProfileInput.parse(value)),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="max-w-md space-y-5"
      noValidate
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <form.Field key={f.name} name={f.name}>
            {(field) => {
              const invalid = field.state.meta.errors.length > 0;
              return (
                <div className="space-y-1.5">
                  <Label
                    htmlFor={field.name}
                    className="text-k-fg-dim text-[11px]"
                  >
                    {f.label}
                  </Label>
                  <div className="relative">
                    <Input
                      id={field.name}
                      type="text"
                      inputMode="decimal"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      aria-invalid={invalid}
                      className="border-k-line-strong bg-k-well h-10 rounded-[9px] pr-11 font-mono text-sm shadow-none"
                    />
                    <span className="text-k-fg-faint absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                      {f.unit}
                    </span>
                  </div>
                  <FieldError errors={field.state.meta.errors} />
                </div>
              );
            }}
          </form.Field>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={saveProfile.isPending}
          className="rounded-[9px] font-bold"
        >
          {saveProfile.isPending ? "保存中…" : "保存"}
        </Button>
        {saveProfile.isSuccess ? (
          <span className="text-k-success text-xs">保存しました</span>
        ) : null}
        {saveProfile.isError ? (
          <span className="text-k-danger text-xs">保存に失敗しました</span>
        ) : null}
      </div>
    </form>
  );
}

function FieldError({
  errors,
}: {
  errors: ReadonlyArray<{ message?: string } | undefined>;
}) {
  if (errors.length === 0) return null;
  return (
    <p className="text-k-danger text-xs" role="alert">
      {errors
        .map((e) => e?.message)
        .filter(Boolean)
        .join(", ")}
    </p>
  );
}
