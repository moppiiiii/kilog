import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { $supabaseServer } from "@/lib/supabase/server";
import { type Profile, UpdateProfileInput } from "@/schemas/profile";

import { loadProfile } from "./profile.server";

// プロフィール（身長・目標値）の serverFn。読み取りと更新をここに集約する。
// 集計 serverFn 内で使う共有ヘルパー loadProfile は profile.server.ts（server-only）にある。

export const getProfile = createServerFn().handler(
  async (): Promise<Profile> => {
    const $supabase = await $supabaseServer();
    return loadProfile($supabase);
  },
);

export const profileQueryOptions = () =>
  queryOptions({ queryKey: ["profile"], queryFn: () => getProfile() });

/** 現在ユーザーのプロフィールを更新する（身長・目標値）。行が無ければ作成する。 */
export const updateProfile = createServerFn({ method: "POST" })
  .validator(UpdateProfileInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const {
      data: { user },
    } = await $supabase.raw.auth.getUser();
    if (!user) throw new Error("未認証です");

    // 1 ユーザー 1 行。行が無いケースもあるため user_id で upsert する
    // （型付きエンジンは upsert 未対応なので .raw に退避）。
    const { error } = await $supabase.raw
      .from("profiles")
      .upsert({ user_id: user.id, ...data }, { onConflict: "user_id" });
    if (error) throw error;
  });
