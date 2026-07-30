import type { FoodCandidate } from "@/schemas/meals";

// 食事入力の補完候補。過去の meal_entries を食品名で畳んで候補にし、絞り込みは
// クライアント側の純粋関数で行う（打鍵ごとにサーバへ問い合わせない）。
// serverFn の handler（畳み込み）と入力フォーム（絞り込み）の両方から使う。

/** 候補の材料。meal_entries の 1 行、または追加しようとしている 1 品。 */
export type FoodCandidateSource = {
  name: string;
  qty: string;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
};

/** 同じ食品とみなすキー。前後の空白と英数の大小差は無視する。 */
const candidateKey = (name: string) => name.trim().toLowerCase();

/** よく食べる順 → 同数なら名前順。候補の並びはこの 1 本に揃える。 */
const byFrequency = (a: FoodCandidate, b: FoodCandidate) =>
  b.count - a.count || a.name.localeCompare(b.name, "ja");

const toCandidate = (entry: FoodCandidateSource, count: number) => ({
  name: entry.name.trim(),
  qty: entry.qty,
  kcal: entry.kcal,
  macros: { p: entry.protein_g, f: entry.fat_g, c: entry.carb_g },
  count,
});

/**
 * 記録の並びを候補リストへ畳む。**新しい順に並んだ `entries`** を渡すこと
 * （最初に現れた行＝直近の記録の kcal / PFC を候補の値として採る）。
 */
export function foldFoodCandidates(
  entries: FoodCandidateSource[],
): FoodCandidate[] {
  const byKey = new Map<string, FoodCandidate>();

  for (const entry of entries) {
    const name = entry.name.trim();
    if (name === "") continue;
    const key = candidateKey(name);
    const seen = byKey.get(key);
    // 2 件目以降は回数だけ増やす（値は直近＝最初に見た行のものを保つ）。
    byKey.set(
      key,
      seen ? { ...seen, count: seen.count + 1 } : toCandidate(entry, 1),
    );
  }

  return [...byKey.values()].sort(byFrequency);
}

/**
 * 追加した 1 品を候補リストへ反映する。再取得せずに候補を最新へ保つための
 * キャッシュ更新用（値は今回の入力で上書きし、回数を 1 増やす）。
 */
export function bumpFoodCandidate(
  candidates: FoodCandidate[],
  entry: FoodCandidateSource,
): FoodCandidate[] {
  const name = entry.name.trim();
  if (name === "") return candidates;

  const key = candidateKey(name);
  const previous = candidates.find((c) => candidateKey(c.name) === key);
  return [
    toCandidate(entry, (previous?.count ?? 0) + 1),
    ...candidates.filter((c) => candidateKey(c.name) !== key),
  ].sort(byFrequency);
}

/**
 * 入力中の文字列で候補を絞る。前方一致を部分一致より前に出し、同じ一致度の中では
 * 候補リストの並び（よく食べる順）を保つ。空欄なら先頭から `limit` 件。
 */
export function filterFoodCandidates(
  candidates: FoodCandidate[],
  query: string,
  limit: number,
): FoodCandidate[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return candidates.slice(0, limit);

  const prefix: FoodCandidate[] = [];
  const partial: FoodCandidate[] = [];
  for (const candidate of candidates) {
    const name = candidate.name.toLowerCase();
    if (name.startsWith(needle)) prefix.push(candidate);
    else if (name.includes(needle)) partial.push(candidate);
  }

  return [...prefix, ...partial].slice(0, limit);
}
