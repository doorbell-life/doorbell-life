// 各物種的遊戲內容。每份內容的照顧知識都來自飼養系列、臨時照顧系列文章的同一批來源（CLAUDE.md §9）。
// 建置時用 checkContent() 檢查，缺來源就建置失敗。
import { checkContent, type SpeciesContent } from "../engine";
import dog from "./dog";
import cat from "./cat";
import rabbit from "./rabbit";
import guineaPig from "./guinea-pig";
import hamster from "./hamster";
import bird from "./bird";

export const SPECIES: SpeciesContent[] = [dog, cat, rabbit, guineaPig, hamster, bird];

for (const c of SPECIES) {
  const errs = checkContent(c);
  if (errs.length) throw new Error("飼養體驗遊戲內容不合格：\n" + errs.join("\n"));
}
