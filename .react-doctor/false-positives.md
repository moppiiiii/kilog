# React Doctor — 既知の誤検知・意図的な保留

`/doctor` の triage はスキャン後にこのファイルを読み、ここに書かれた形に一致する指摘を落とす。

**ルールは 1 つも無効化していない**（`doctor.config.*` は未作成＝既定のまま）。理由は、どの指摘も
「ルール自体は有用だが、この箇所には当てはまらない」ためで、プロジェクト全体で止めると将来の
本物の問題を見逃すから。したがって `npx react-doctor` の出力とスコアにはこれらが残り続ける。
**残り 1 件がこの一覧と一致するなら clean と扱ってよい。**

最終確認日: 2026-07-28（残り 1 件 / スコア 97「Great」）

> **解消済み（このファイルでの抑制は不要になった）**
>
> - `react-doctor/tanstack-start-get-mutation`（`src/server/reports.ts`）— 集計用の Map を
>   ハンドラ外の純関数（`muscleVolumes` / `personalBestsIn` / `mealAverages`）へ切り出して発火を解消。
> - `react-doctor/no-event-handler`（`src/components/workouts/rest-timer.tsx`）— カウントダウンと
>   「0 到達で停止＋合図」を 1 つの effect に統合して解消。**このルールは cleanup を持つ effect には
>   発火しない**ため、`setInterval` を `setTimeout` の毎秒再スケジュールに替え、0 到達の判定を
>   ティック内（state 更新関数の外）で行う形にした。`no-impure-state-updater` も再導入していない。
>
> どちらも**ルールを黙らせたのではなく、ルールの判定基準に照らして正しく非該当になる形へ直した**。
> 同種の指摘が出たら、まず「抑制」ではなく「当たらない形にできないか」を先に検討すること。

---

## 意図的な保留（指摘自体は正しい）

### `deslop/unused-file` — `src/lib/supabase/client.ts`

**これは誤検知ではない。** ファイルは実際にどこからも到達できず、ビルドにも含まれていない。

残している理由は、`src/lib/supabase/index.ts` に
「クライアント実体は環境跨ぎの誤 import を防ぐため re-export しない」と文書化された、
Realtime 等の直叩き用に用意された**意図的な例外の口**だから。

**この保留は恒久的ではない。** ブラウザから Supabase を直接叩く用途を採らないと決まった時点で、
このファイルは普通に削除すべきデッドコードになる。その際はこの節も削除すること
（＝ react-doctor は 0 件 / 100 点になる）。

なお `deslop/unused-file` はルール単位で無効化できない（`rules explain` が Unknown rule を返す）。
唯一の抑制手段は `--no-dead-code` だが、それは未使用 export・未使用依存・循環 import の検出も
まとめて失うため採らない。
