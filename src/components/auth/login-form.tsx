import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";

import { Pane, Panel, PanelTitle, TopBar } from "@/components/kirog/console";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignIn } from "@/hooks/use-sign-in";
import { CredentialsSchema } from "@/schemas/auth";

// ログイン画面。_authed の外なので共通ヘッダーが無く、ここで単独のブランド面を持つ。
// 招待制／個人用のため LP は持たず、中央にフォームパネルだけを置く。
// 検証は schemas/auth の CredentialsSchema を共有し、送信は useSignIn に委譲する。

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const navigate = useNavigate();
  const signIn = useSignIn();
  const [revealed, setRevealed] = useState(false);

  const dest = redirectTo ?? "/";
  const authError = signIn.error;

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: CredentialsSchema },
    onSubmit: async ({ value }) => {
      try {
        await signIn.mutateAsync(value);
        navigate({ href: dest });
      } catch {
        // 失敗はミューテーションの error として表示する（submit 自体は完了扱い）。
      }
    },
  });

  // 背景の光と方眼は styles.css の body::before / ::after が全ページ共通で敷く。
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-8">
      <div className="w-full max-w-[400px]">
        <Panel className="bg-k-panel/85 w-full backdrop-blur">
          <TopBar className="py-4">
            <PanelTitle sub="KIROG">ログイン</PanelTitle>
          </TopBar>

          <Pane className="p-7">
            <div className="mb-7">
              <Wordmark />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void form.handleSubmit();
              }}
              className="space-y-5"
              noValidate
            >
              <form.Field name="email">
                {(field) => {
                  const invalid = field.state.meta.errors.length > 0;
                  return (
                    <div className="space-y-2">
                      <Label htmlFor={field.name} className={LABEL_CLASS}>
                        EMAIL · メールアドレス
                      </Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={invalid}
                        className={FIELD_CLASS}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </div>
                  );
                }}
              </form.Field>

              <form.Field name="password">
                {(field) => {
                  const invalid = field.state.meta.errors.length > 0;
                  return (
                    <div className="space-y-2">
                      <Label htmlFor={field.name} className={LABEL_CLASS}>
                        PASSWORD · パスワード
                      </Label>
                      <div className="relative">
                        <Input
                          id={field.name}
                          name={field.name}
                          type={revealed ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="8文字以上"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={invalid}
                          className={`${FIELD_CLASS} pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setRevealed((current) => !current)}
                          aria-pressed={revealed}
                          aria-label={
                            revealed
                              ? "パスワードを隠す"
                              : "パスワードを表示する"
                          }
                          className="text-k-fg-faint hover:text-k-fg-sub focus-visible:ring-k-accent/40 absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg transition-colors outline-none focus-visible:ring-2"
                        >
                          {revealed ? (
                            <EyeOff aria-hidden className="size-4" />
                          ) : (
                            <Eye aria-hidden className="size-4" />
                          )}
                        </button>
                      </div>
                      <FieldError errors={field.state.meta.errors} />
                    </div>
                  );
                }}
              </form.Field>

              {authError ? (
                <div
                  role="alert"
                  className="border-k-danger/40 bg-k-danger/10 text-k-danger flex items-start gap-2.5 rounded-[10px] border px-3.5 py-3 text-[13px]"
                >
                  <AlertCircle aria-hidden className="mt-px size-4 shrink-0" />
                  <span className="break-words">{authError.message}</span>
                </div>
              ) : null}

              <form.Subscribe selector={(s) => s.isSubmitting}>
                {(isSubmitting) => (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 w-full rounded-[10px] text-sm font-bold"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 aria-hidden className="size-4 animate-spin" />
                        認証中…
                      </>
                    ) : (
                      "ログイン"
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          </Pane>
        </Panel>
      </div>
    </div>
  );
}

const LABEL_CLASS = "text-k-fg-dim font-mono text-[11px] tracking-[1px]";

const FIELD_CLASS =
  "border-k-line-strong bg-k-well text-k-fg placeholder:text-k-fg-faint focus-visible:border-k-accent focus-visible:ring-k-accent/25 h-11 rounded-[10px] px-3.5 text-sm shadow-none";

function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <span className="text-k-ink flex size-9 items-center justify-center rounded-[11px] bg-[linear-gradient(135deg,#5b8bff,#3f6ae0)] text-lg font-black">
        K
      </span>
      <span className="text-lg font-bold tracking-wide">KIROG</span>
    </div>
  );
}

// フィールド検証エラー（zod の issue）を 1 行で表示する小さなヘルパー。
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
