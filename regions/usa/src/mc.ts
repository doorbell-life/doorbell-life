// Montgomery County, MD「Adoptable Pets」開放資料 → 統一格式。
// 資料集說明：https://data.montgomerycountymd.gov/Public-Safety/Adoptable-Pets/e54u-qx42
// 授權 Public Domain，不需金鑰，來源標示每兩小時更新。全部是收容所標示可認養的動物，一律歸 animals-adopt。
import { clean, cleanUrl, type Case } from "@doorbell-life/schema";

export const MC_URL = "https://data.montgomerycountymd.gov/resource/e54u-qx42.json?$limit=5000";

// 資料集只有一間收容所，資料裡沒有聯絡資訊；以下取自郡政府官網（2026-11-03 查核）：
// https://www.montgomerycountymd.gov/animalservices/about/contact.html
export const SHELTER = {
  name: "Montgomery County Animal Services and Adoption Center",
  phone: "240-773-5900",
  address: "7315 Muncaster Mill Rd., Derwood, MD 20855",
};

// 判斷來源是否改了格式：這些欄位缺任何一個就視為格式異常。
export const REQUIRED = ["animalid", "indate", "petname", "animaltype", "petage", "petsize", "color", "breed", "sex"] as const;

// 2026-11-03 對照收容所自己的個案頁（petharbor.com/pet.asp?uaid=MONT.{animalid}）：S = spayed female、N = neutered male。
const SEX: Record<string, string> = { S: "Spayed female", N: "Neutered male", M: "Male", F: "Female" };
const SIZE: Record<string, string> = { SMALL: "small", MED: "medium", LARGE: "large" };
const TYPE: Record<string, string> = { DOG: "Dog", CAT: "Cat" };

type Raw = Record<string, unknown>;

// 來源全是大寫，例如 "AM PIT BULL TER / MIX" → "Am Pit Bull Ter / Mix"。
const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (_, p, c) => p + c.toUpperCase());

// 名字前的 * 是收容所自己取的名字的標記，不顯示。
const petName = (v: unknown) => titleCase(clean(v, 30).replace(/^\*+/, "").trim());

export function toCase(r: Raw): Case {
  const name = petName(r.petname);
  const breed = titleCase(clean(r.breed, 40));
  // OTHER、BIRD 時品種欄就是物種（例如 Guinea Pig、Chicken），直接當作種類
  const kind = TYPE[String(r.animaltype)] ?? breed;
  const age = clean(r.petage, 20).toLowerCase();
  const url = r.url && typeof r.url === "object" ? (r.url as Raw).url : null;
  const aid = clean(r.animalid, 20);
  return {
    id: aid ? `mc-${aid}` : "", // 空 id 由 invalidReason 擋下

    topic: "animals-adopt",
    title: [name, kind].filter(Boolean).join(" · "),
    features: [
      SEX[String(r.sex)],
      age && age !== "no age" ? age : "",
      SIZE[String(r.petsize)],
      titleCase(clean(r.color, 30)),
      kind === breed ? "" : breed,
    ].filter(Boolean).join(", "),
    // 照片在 petharbor.com，來源給 http 網址；https 同樣可取得（2026-11-03 實測），改用 https
    photo: cleanUrl(typeof url === "string" ? url.replace(/^http:\/\//i, "https://") : null),
    country: "US",
    area: "Montgomery County, MD",
    contentLang: "en",
    contact: { ...SHELTER },
    source: {
      id: "mc-adopt",
      name: "Montgomery County, MD – Adoptable Pets",
      url: "https://data.montgomerycountymd.gov/Public-Safety/Adoptable-Pets/e54u-qx42",
      license: "Public Domain",
    },
    publishedAt: clean(r.indate, 40).slice(0, 10), // 來源是 "2026-11-01T00:00:00.000"，取日期；格式不對由 invalidReason 擋下
    expiresAt: null, // 來源沒有截止日；離開收容所就從來源消失，下一次同步移除
    offlineCacheable: true,
  };
}

// 解析整包資料。格式不對直接丟錯，由同步流程當作異常處理。
export function parseMC(raw: unknown): Raw[] {
  if (!Array.isArray(raw)) throw new Error("Adoptable Pets 回傳不是陣列");
  if (raw.length === 0) throw new Error("Adoptable Pets 回傳空資料");
  const missing = REQUIRED.filter((k) => !(k in (raw[0] as Raw)));
  if (missing.length) throw new Error(`Adoptable Pets 缺少欄位：${missing.join(", ")}`);
  return raw as Raw[];
}
