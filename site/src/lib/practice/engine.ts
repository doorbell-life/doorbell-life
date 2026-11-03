// 飼養體驗遊戲的規則（CLAUDE.md §9 飼養體驗遊戲）。純函式，不碰畫面與儲存，方便測試。
// 真的跨 7 天：開始那天是第 1 天，之後每個日曆日（訪客當地日期）可以照顧一次。
// 進度只存在訪客自己的瀏覽器（§3 第 6 條例外二）；儲存不能用時改成「一次玩完」，用按鈕前進。

export const DAYS = 7;

export interface Choice {
  text: string;
  ok: boolean; // 這樣做對動物好不好
  why: string; // 為什麼，必須來自 source
  source: { name: string; url: string };
}
export interface Task {
  id: string;
  text: string; // 每天要做的照顧，例如「換新鮮的水」
  why: string;
  source: { name: string; url: string };
}
export interface DayEvent {
  prompt: string; // 這一天發生的狀況
  choices: Choice[];
}
export interface SpeciesContent {
  id: string;
  name: string;
  tasks: Task[]; // 每天都該做的事
  events: DayEvent[]; // 第 1–7 天各一個狀況，長度必須等於 DAYS
  missed: string; // 沒來照顧的那一天，動物的狀況（要有來源支持的照顧常識）
  articles: { title: string; url: string }[]; // 結果頁連到的飼養系列文章
}

export interface DayLog { tasks: string[]; answer: number | null }
export interface State {
  v: 1;
  species: string;
  start: string; // YYYY-MM-DD，訪客當地日期
  log: Record<number, DayLog>;
}

const toDay = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000;

// 今天是遊戲的第幾天（從 1 開始）；超過 7 天時回傳 DAYS + 1 表示已結束。
export function gameDay(start: string, today: string): number {
  const d = toDay(today) - toDay(start) + 1;
  if (d < 1) return 1; // 時鐘被調回去時，不讓進度倒退出錯
  return Math.min(d, DAYS + 1);
}

export function newState(species: string, today: string): State {
  return { v: 1, species, start: today, log: {} };
}

// 今天能不能照顧：還在 7 天內，而且今天還沒照顧過。
export function canPlay(s: State, today: string): boolean {
  const d = gameDay(s.start, today);
  return d <= DAYS && !s.log[d];
}

export function record(s: State, day: number, log: DayLog): State {
  if (day < 1 || day > DAYS || s.log[day]) return s;
  return { ...s, log: { ...s.log, [day]: log } };
}

// 已經過去、卻沒有照顧的天數。
export function missedDays(s: State, today: string): number[] {
  const current = gameDay(s.start, today);
  const out: number[] = [];
  for (let d = 1; d < Math.min(current, DAYS + 1); d++) if (!s.log[d]) out.push(d);
  return out;
}

export function finished(s: State, today: string): boolean {
  return gameDay(s.start, today) > DAYS || Object.keys(s.log).length === DAYS;
}

export type Level = "ready" | "almost" | "not-yet";
export interface Result { cared: number; missed: number; tasksDone: number; tasksTotal: number; correct: number; level: Level }

export function result(s: State, c: SpeciesContent, _today?: string): Result {
  const days = Object.keys(s.log).map(Number);
  const missed = DAYS - days.length;
  const tasksTotal = DAYS * c.tasks.length;
  const tasksDone = days.reduce((n, d) => n + s.log[d].tasks.filter((t) => c.tasks.some((x) => x.id === t)).length, 0);
  const correct = days.filter((d) => {
    const a = s.log[d].answer;
    return a !== null && c.events[d - 1]?.choices[a]?.ok;
  }).length;
  // 遊戲設計的門檻：一天都沒漏、照顧項目九成以上、狀況題答對 6 題以上才算準備好
  const level: Level =
    missed === 0 && tasksDone >= tasksTotal * 0.9 && correct >= 6 ? "ready" : missed <= 1 && tasksDone >= tasksTotal * 0.7 && correct >= 4 ? "almost" : "not-yet";
  return { cared: days.length, missed, tasksDone, tasksTotal, correct, level };
}

// 從儲存讀回來的資料一律不信任：格式不對就當作沒有進度。
export function parseState(raw: string | null): State | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (s?.v !== 1 || typeof s.species !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s.start) || typeof s.log !== "object" || s.log === null) return null;
    const log: Record<number, DayLog> = {};
    for (const [k, v] of Object.entries(s.log as Record<string, DayLog>)) {
      const d = Number(k);
      if (!Number.isInteger(d) || d < 1 || d > DAYS || !Array.isArray(v?.tasks)) return null;
      log[d] = { tasks: v.tasks.filter((t) => typeof t === "string").slice(0, 20), answer: Number.isInteger(v.answer) ? v.answer : null };
    }
    return { v: 1, species: s.species, start: s.start, log };
  } catch {
    return null;
  }
}

// 內容檢查：每個物種剛好 7 個狀況，每個選項、每項照顧都有來源與理由。
export function checkContent(c: SpeciesContent): string[] {
  const errs: string[] = [];
  if (c.events.length !== DAYS) errs.push(`${c.id}：狀況題要剛好 ${DAYS} 個，現在 ${c.events.length} 個`);
  for (const t of c.tasks) if (!t.why || !t.source?.url?.startsWith("https://")) errs.push(`${c.id}：照顧項目「${t.text}」缺理由或來源`);
  c.events.forEach((e, i) => {
    if (!e.choices.some((x) => x.ok)) errs.push(`${c.id}：第 ${i + 1} 天沒有正確選項`);
    for (const x of e.choices) if (!x.why || !x.source?.url?.startsWith("https://")) errs.push(`${c.id}：第 ${i + 1} 天選項「${x.text}」缺理由或來源`);
  });
  if (!c.articles.length) errs.push(`${c.id}：結果頁沒有連到文章`);
  return errs;
}
