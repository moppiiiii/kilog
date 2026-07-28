// 表示整形の純粋ヘルパー。UI 側で toLocaleString / padStart を散らかさない。

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

export function num(value: number, fractionDigits = 0): string {
  return value.toLocaleString("ja-JP", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** 小数第 1 位まで。ただし整数なら小数点を出さない（72.5kg / 60kg）。 */
export function kg(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * 量の表示。整数はそのまま（桁区切りあり）、小数は 1 桁まで表示する（例: 1,200 / 20.5）。
 * kcal・PFC のように「普段は整数だが 0.5 などもあり得る」値に使う。
 */
export function dec(value: number): string {
  return num(value, Number.isInteger(value) ? 0 : 1);
}

/** 符号を必ず付ける（+2.5 / -1.8 / ±0）。 */
export function signed(value: number, fractionDigits = 1): string {
  if (value === 0) return "±0";
  const sign = value > 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(fractionDigits)}`;
}

export function signedPct(value: number, fractionDigits = 1): string {
  return `${signed(value, fractionDigits)}%`;
}

/** 秒 → m:ss。 */
export function clock(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const m = Math.floor(sec / 60);
  return `${m}:${String(sec % 60).padStart(2, "0")}`;
}

export function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

// Intl のコンストラクタはロケールデータを読み込むので、呼ぶたびに作り直さず
// モジュール直下で 1 度だけ生成する（ロケール・オプションとも固定のため安全）。
const JST_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * 今日の日付を JST（Asia/Tokyo）で "YYYY-MM-DD" 返す。
 * toISOString() は UTC 基準なので、日本の午前中はまだ前日になりズレる。
 */
export function todayIso(): string {
  return JST_DATE.format(new Date());
}

/** ISO 日付（YYYY-MM-DD）に日数を足し引きする。UTC 基準で桁だけ動かす純計算。 */
export function addDaysIso(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

const JST_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * ISO タイムスタンプ → JST の "H:mm"（時は 0 埋めなし。例: "8:30" / "19:00"）。
 * セッション名の自動生成に使う。toISOString() は UTC なので Intl で JST 変換する。
 */
export function timeHm(iso: string): string {
  const parts = JST_TIME.formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === "hour")?.value ?? "0";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${Number(hour)}:${minute}`;
}

/** "2026-07-22" → "07/22" */
export function monthDay(iso: string): string {
  const d = toDate(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

/** "2026-07-22" → "WED" */
export function dow(iso: string): string {
  return DOW[toDate(iso).getDay()] ?? "";
}

/** "2026-07-22" → "2026.07.22 WED" */
export function stampDate(iso: string): string {
  const d = toDate(iso);
  const ymd = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join(".");
  return `${ymd} ${dow(iso)}`;
}

/** "2026-07" → "2026年 7月" */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年 ${Number(m)}月`;
}

export type Tone = "up" | "down" | "flat";

/** 増減を色クラスへ。減量など「下がって良い」指標は invert する。 */
export function toneClass(tone: Tone): string {
  if (tone === "up") return "text-k-success";
  if (tone === "down") return "text-k-danger";
  return "text-k-fg-dim";
}

export function toneOf(value: number, invert = false): Tone {
  if (value === 0) return "flat";
  const positive = value > 0;
  return (invert ? !positive : positive) ? "up" : "down";
}
