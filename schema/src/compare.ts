// 共同題目比較（CLAUDE.md §9 共同題目比較）：欄位定義。只列事實，不打分數、不排名、不給總評。
// 各地區的值放在 regions/{地區}/compare/{題目}.json；沒有查證的欄位顯示「尚未查證」，不留白也不推測。

export interface CompareField { key: string; label: { "zh-TW": string; en: string } }
export interface CompareTopic {
  id: string; // 網址最後一段
  topic: "missing" | "blood" | "animals"; // 網址的議題段
  title: { "zh-TW": string; en: string };
  fields: CompareField[];
}

export const COMPARE_TOPICS: CompareTopic[] = [
  {
    id: "how-to-report-missing",
    topic: "missing",
    title: { "zh-TW": "家人失蹤了，各地怎麼報案？", en: "How do you report a missing person in different places?" },
    fields: [
      { key: "waiting-period", label: { "zh-TW": "報案要不要等待期", en: "Is there a waiting period before reporting?" } },
      { key: "who-and-where", label: { "zh-TW": "誰可以報、到哪裡報", en: "Who can report, and where" } },
      { key: "alert-systems", label: { "zh-TW": "兒少與失智長者的緊急通報機制", en: "Emergency alerts for children and older adults with dementia" } },
      { key: "rates", label: { "zh-TW": "失蹤人口率與尋獲率（每十萬人）", en: "Missing-person rate and recovery rate (per 100,000 people)" } },
    ],
  },
  {
    id: "who-can-donate-blood",
    topic: "blood",
    title: { "zh-TW": "誰可以捐血？各地規定比一比", en: "Who can donate blood? Rules compared" },
    fields: [
      { key: "age", label: { "zh-TW": "年齡範圍", en: "Age range" } },
      { key: "min-weight", label: { "zh-TW": "最低體重", en: "Minimum weight" } },
      { key: "whole-blood-interval", label: { "zh-TW": "全血捐血間隔", en: "Interval between whole-blood donations" } },
      { key: "paid-or-voluntary", label: { "zh-TW": "有償或無償", en: "Paid or voluntary" } },
    ],
  },
  {
    id: "shelter-adoption",
    topic: "animals",
    title: { "zh-TW": "到公立收容所認養，各地規定比一比", en: "Adopting from a public shelter: rules compared" },
    fields: [
      { key: "fee", label: { "zh-TW": "認養費用", en: "Adoption fee" } },
      { key: "adopter-requirements", label: { "zh-TW": "認養人條件", en: "Who can adopt" } },
      { key: "class-or-interview", label: { "zh-TW": "要不要上課或面談", en: "Class or interview required?" } },
      { key: "stray-hold-period", label: { "zh-TW": "無主動物公告幾天才開放認養", en: "How long strays are held before adoption" } },
    ],
  },
];

export interface CompareValue {
  value: string; // 用該地區的語言寫；各地規定不同時寫明是舉例
  sources: { name: string; url: string; checkedAt: string }[];
}
// 地區檔：{ [fieldKey]: CompareValue | null }，null 表示尚未查證
export type CompareRegionFile = { practice?: string; fields: Record<string, CompareValue | null> };

// 檢查地區檔：只能有定義過的欄位；有值就要有官方來源與查核日。
export function checkCompareFile(t: CompareTopic, f: CompareRegionFile): string[] {
  const errs: string[] = [];
  const keys = new Set(t.fields.map((x) => x.key));
  for (const k of Object.keys(f.fields)) if (!keys.has(k)) errs.push(`${t.id}：未定義的欄位 ${k}`);
  for (const [k, v] of Object.entries(f.fields)) {
    if (v === null) continue;
    if (!v.value?.trim()) errs.push(`${t.id}.${k}：值是空的，沒查證請用 null`);
    if (!v.sources?.length) errs.push(`${t.id}.${k}：沒有來源`);
    for (const s of v.sources ?? []) {
      if (!s.url?.startsWith("https://")) errs.push(`${t.id}.${k}：來源網址必須是 https`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s.checkedAt ?? "")) errs.push(`${t.id}.${k}：缺查核日`);
    }
  }
  return errs;
}
