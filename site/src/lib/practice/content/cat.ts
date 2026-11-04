// 飼養體驗遊戲：貓。照顧知識只取自飼養系列文章已引用的官方來源（CLAUDE.md §9）。
import type { SpeciesContent } from "../engine";

const CAT = { name: "農業部：寵物飼養與照顧指南－貓篇（文字版）", url: "https://animal.moa.gov.tw/public/upload/Know_ArticleFile/251224011608838794UDZMX.pdf" };
const CAT_QA = { name: "農業部動物保護資訊網：哺乳類動物飼養及照顧指南ＱＡ【貓隻篇】", url: "https://animal.moa.gov.tw/Frontend/Know/Detail/LT00000826?parentID=Tab0000126" };

const cat: SpeciesContent = {
  id: "cat",
  name: "貓",
  tasks: [
    { id: "water", text: "確認有乾淨的水", why: "依《動物保護法》，貓任何時候都要有充足、乾淨的水；平常吃乾糧的貓更要注意喝水量。", source: CAT },
    { id: "food", text: "按時餵飯，吃完把碗洗乾淨", why: "貓篇的定時餵法是依需求每天分 3 到 5 次、份量固定，每次吃完把食盆清乾淨。", source: CAT },
    { id: "litter", text: "清貓砂盆", why: "貓砂盆有異味，貓會不想進去上廁所，貓篇建議每天清 2 到 3 次排泄物。", source: CAT },
    { id: "play", text: "用逗貓棒陪牠玩", why: "養在室內的貓也需要運動和探索，追到實體的玩具會讓牠有成就感。", source: CAT },
    { id: "check", text: "看看牠的食量、精神和上廁所的狀況", why: "吃喝的份量、精神、上廁所次數有明顯變化時，要即時問獸醫。", source: CAT },
  ],
  events: [
    {
      prompt: "第一天把牠帶回家，牠看起來很緊張、想找地方躲。你會怎麼安排？",
      choices: [
        { text: "伸手把牠拉出來抱抱，讓牠習慣你", ok: false, why: "貓對環境變化很敏感，貓篇建議讓牠自己走出來、自己熟悉環境。", source: CAT },
        { text: "準備一間安靜的房間，放好紙箱、食物、水和貓砂盆，讓牠自己出來", ok: true, why: "貓篇建議先關上門窗，讓牠在安靜的房間自己熟悉環境，穩定後再讓牠探索整個家。", source: CAT },
      ],
    },
    {
      prompt: "新買的沙發被牠抓出好幾道痕。",
      choices: [
        { text: "準備貓抓板或貓抓柱放在旁邊", ok: true, why: "磨爪是貓的習性，準備貓抓板、貓抓柱可以滿足這個需求。", source: CAT_QA },
        { text: "帶去動物醫院把爪子去掉", ok: false, why: "貓篇說不應該幫貓去爪，要讓牠維持正常的生理機能。", source: CAT },
      ],
    },
    {
      prompt: "你在吃加了蔥和蒜的鹹酥雞，牠跳上桌湊過來聞。",
      choices: [
        { text: "挑一塊沒什麼調味的給牠", ok: false, why: "蔥、蒜和太鹹太油的食物可能危害貓的健康。", source: CAT },
        { text: "把食物收好，給牠貓吃的乾糧或罐頭", ok: true, why: "貓篇建議給品質合格、符合牠營養需求的乾飼料、罐頭或沒調味的鮮食。", source: CAT },
      ],
    },
    {
      prompt: "牠今天吐了好幾次，還拉肚子，一直躲著不動。",
      choices: [
        { text: "餵牠家裡的人用腸胃藥", ok: false, why: "人吃的藥對貓通常有劇毒，不能給貓吃。", source: CAT },
        { text: "馬上聯絡動物醫院，請獸醫看看", ok: true, why: "嘔吐、腹瀉這類比較嚴重的急症症狀，應該即時諮詢獸醫師。", source: CAT },
      ],
    },
    {
      prompt: "週末要出去玩兩天。",
      choices: [
        { text: "多放幾碗飼料和水，貓自己在家沒問題", ok: false, why: "貓篇提醒，長時間不在家要替貓安排適當的照顧者。", source: CAT },
        { text: "請懂貓的親友幫忙照顧，交代清楚牠的習慣和身體狀況", ok: true, why: "貓篇建議照顧者要了解這隻貓的身體狀況和特殊需求，也要注意換環境可能帶給牠的壓力。", source: CAT },
      ],
    },
    {
      prompt: "天氣很好，你想打開窗戶通風，但紗窗有點鬆。",
      choices: [
        { text: "直接開，貓很靈活，不會掉下去", ok: false, why: "貓篇特別提醒，貓可能因為好奇而發生墜樓意外，住高樓更要小心。", source: CAT },
        { text: "先把紗窗修牢、門窗做好防護再開", ok: true, why: "貓篇建議門窗都要有適當防護，紗窗要穩固，不要有太大的縫或容易被推開。", source: CAT },
      ],
    },
    {
      prompt: "要帶牠去打疫苗，牠一看到外出籠就躲起來。",
      choices: [
        { text: "不用外出籠，直接抱著牠出門", ok: false, why: "貓篇建議貓外出時放在大小適當的外出籠裡，避免走失或受驚嚇失控。", source: CAT },
        { text: "平常就把外出籠放在家裡，當成牠休息、躲藏的地方", ok: true, why: "貓篇建議平常把外出籠當成遊戲、休息的空間，讓牠不再一看到籠子就聯想到看醫生。", source: CAT },
      ],
    },
  ],
  missed: "這一天沒人清貓砂、換水；貓砂盆髒了貓會不想進去上廁所，牠也需要隨時有乾淨的水。",
  articles: [
    { title: "帶寵物回家的第一個月，要做什麼？", url: "/articles/taiwan/animals/care-first-month/" },
    { title: "養寵物每天要花多少時間照顧？", url: "/articles/taiwan/animals/care-daily-time/" },
    { title: "養一隻寵物一年要花多少錢？", url: "/articles/taiwan/animals/care-annual-cost/" },
    { title: "認養前要準備什麼？", url: "/articles/taiwan/animals/before-adopting/" },
    { title: "公立收容所的認養流程是什麼？", url: "/articles/taiwan/animals/shelter-adoption-process/" },
    { title: "為什麼要幫寵物植入晶片？", url: "/articles/taiwan/animals/why-microchip/" },
    { title: "幫朋友照顧貓，交接時要問什麼、出狀況怎麼辦？", url: "/articles/taiwan/animals/pet-sitting-cat/" },
  ],
};

export default cat;
