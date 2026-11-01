// D01 動物認領養（農業部）→ 統一格式。來源說明：https://data.gov.tw/dataset/85903
import { clean, cleanUrl, type Case } from "@doorbell-life/schema";

export const D01_URL = "https://data.moa.gov.tw/Service/OpenData/TransService.aspx?UnitId=QcbUEzN6E6DL&IsTransData=1";

// animal_area_pkid → 縣市。2026-10-31 以實際資料比對 shelter_address 得出，每個代碼只對應一個縣市。
export const AREA: Record<number, string> = {
  2: "臺北市", 3: "新北市", 4: "基隆市", 5: "宜蘭縣", 6: "桃園市", 7: "新竹縣", 8: "新竹市",
  9: "苗栗縣", 10: "臺中市", 11: "彰化縣", 12: "南投縣", 13: "雲林縣", 14: "嘉義縣", 15: "嘉義市",
  16: "臺南市", 17: "高雄市", 18: "屏東縣", 19: "花蓮縣", 20: "臺東縣", 21: "澎湖縣", 22: "金門縣",
  23: "連江縣",
};

const SEX: Record<string, string> = { M: "公", F: "母" };
const AGE: Record<string, string> = { ADULT: "成年", CHILD: "幼年" };
const BODY: Record<string, string> = { SMALL: "小型", MEDIUM: "中型", BIG: "大型" };

// 判斷來源是否改了格式：這些欄位缺任何一個就視為格式異常。
export const REQUIRED = [
  "animal_id", "animal_area_pkid", "animal_kind", "animal_status", "animal_opendate",
  "animal_closeddate", "shelter_name", "shelter_tel", "shelter_address", "album_file",
] as const;

type Raw = Record<string, unknown>;

function dayBefore(d: string): string {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() - 1);
  return t.toISOString().slice(0, 10);
}

// 開放認養日還沒到的個案，當作「走失毛孩找主人」：可能有飼主正在找牠（維護者 2026-11-01 決定）。
// 不一定每一隻都在等飼主領回，所以文字只寫事實：開放認養日，以及若是你的毛孩請聯絡收容所。
// 到了開放認養日，同一筆會自動變回待認養。
export function toCase(r: Raw, today: string): Case {
  const variety = clean(r.animal_Variety, 30);
  const kind = clean(r.animal_kind, 10);
  const closed = clean(r.animal_closeddate, 10);
  const open = clean(r.animal_opendate, 10);
  const lost = open > today;
  const traits = [
    SEX[String(r.animal_sex)],
    AGE[String(r.animal_age)],
    BODY[String(r.animal_bodytype)],
    clean(r.animal_colour, 20),
    clean(r.animal_remark, 120),
  ].filter(Boolean).join("、");
  const found = clean(r.animal_foundplace, 40);
  return {
    id: `d01-${clean(r.animal_id, 20)}`,
    topic: lost ? "animals-lost" : "animals-adopt",
    title: variety && variety !== kind ? `${kind}・${variety}` : kind,
    features: lost
      ? [found && `在${found}附近被發現`, traits, `${open} 開放認養，若是你走失的毛孩請盡快聯絡收容所`].filter(Boolean).map((x) => x.replace(/[。.]+$/, "")).join("。")
      : traits,
    photo: cleanUrl(r.album_file),
    country: "TW",
    area: AREA[Number(r.animal_area_pkid)] ?? "",
    contentLang: "zh-TW",
    contact: {
      name: clean(r.shelter_name, 40),
      phone: clean(r.shelter_tel, 30),
      address: clean(r.shelter_address, 80),
    },
    source: {
      id: "d01",
      name: "農業部 動物認領養",
      url: "https://data.gov.tw/dataset/85903",
      license: "政府資料開放授權條款第1版",
    },
    // 約 3% 個案 animal_opendate 空白但仍開放認養（2026-10-31 實測 297/8679），退回用建立日、更新日
    // 走失毛孩的開放認養日在未來，上架日改用建立日
    publishedAt: (lost ? "" : open) || clean(r.animal_createtime, 10) || clean(r.cDate, 10),
    // 走失毛孩在開放認養日前一天下架；待認養依來源的截止日（來源用 2999-12-31 表示未設期限）
    expiresAt: lost ? dayBefore(open) : closed && closed !== "2999-12-31" ? closed : null,
    offlineCacheable: true,
  };
}

// 解析整包資料。格式不對直接丟錯，由同步流程當作異常處理。
export function parseD01(raw: unknown): Raw[] {
  if (!Array.isArray(raw)) throw new Error("D01 回傳不是陣列");
  if (raw.length === 0) throw new Error("D01 回傳空資料");
  const missing = REQUIRED.filter((k) => !(k in (raw[0] as Raw)));
  if (missing.length) throw new Error(`D01 缺少欄位：${missing.join(", ")}`);
  return (raw as Raw[]).filter((r) => r.animal_status === "OPEN");
}
