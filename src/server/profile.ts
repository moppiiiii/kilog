import type { $supabaseServer } from "@/lib/supabase/server";
import { normalizeProfile, type Profile } from "@/schemas/profile";

// プロフィールはルート単体では使わず、各集計 serverFn の内部で目標値・身長を引くための helper。
// 呼び出し側が生成済みの $supabase を渡す（同一リクエストで getSession を二重に呼ばない）。

type Server = Awaited<ReturnType<typeof $supabaseServer>>;

/** 現在ユーザーのプロフィールを正規化して返す。行が無ければテーブル default 相当で埋める。 */
export async function loadProfile($supabase: Server): Promise<Profile> {
  const rows = (await $supabase("@select/profiles", {})).unwrapOr([]);
  return normalizeProfile(rows[0] ?? null);
}
