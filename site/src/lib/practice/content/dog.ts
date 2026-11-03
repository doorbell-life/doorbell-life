// 飼養體驗遊戲：狗。照顧知識只取自飼養系列文章已引用的官方來源（CLAUDE.md §9）。
import type { SpeciesContent } from "../engine";

const DOG = { name: "農業部：寵物飼養與照顧指南－犬篇（文字版）", url: "https://animal.moa.gov.tw/public/upload/Know_ArticleFile/251224011538456576U41VU.pdf" };
const DOG_QA = { name: "農業部動物保護資訊網：哺乳類動物飼養及照顧指南ＱＡ【犬隻篇】", url: "https://animal.moa.gov.tw/Frontend/Know/Detail/LT00000825?parentID=Tab0000126" };
const GENERAL = { name: "農業部：寵物飼養與照顧指南通則", url: "https://animal.moa.gov.tw/public/upload/Know_ArticleFile/251224011013327934ADK8J.pdf" };

const dog: SpeciesContent = {
  id: "dog",
  name: "狗",
  tasks: [
    { id: "water", text: "換新鮮的水", why: "依《動物保護法》，狗平常待的地方任何時候都要有充足、乾淨的水。", source: DOG },
    { id: "food", text: "早晚各餵一次", why: "犬篇建議每天至少早晚各餵一次，份量依年齡、活動量和體重調整。", source: DOG },
    { id: "walk", text: "帶出門散步 20 到 30 分鐘", why: "這是犬篇訂的每天最低建議，讓牠接觸外面的環境，有助社會化。", source: DOG },
    { id: "clean", text: "巡一下牠的地方，清掉大小便", why: "犬篇建議每天巡視牠的生活空間，保持乾淨，避免臭味、寄生蟲和潮濕。", source: DOG },
    { id: "company", text: "陪牠玩、待在一起一段時間", why: "只養一隻的話，犬篇建議每天和牠有幾次比較長時間的相處。", source: DOG },
  ],
  events: [
    {
      prompt: "第一天晚上，牠一直叫，叫到鄰居都聽得到。",
      choices: [
        { text: "罵牠、打一下讓牠安靜", ok: false, why: "叫是狗的本能和警覺反應；通則提醒，動物反應不如預期時不應該用責打的方式。", source: GENERAL },
        { text: "給牠一個有安全感的角落，白天多散步、多陪牠玩", ok: true, why: "犬篇建議，狗叫太多時先給牠有安全感的環境，再加上適量散步、緩和的遊戲和陪伴。", source: DOG },
      ],
    },
    {
      prompt: "下班回家，發現拖鞋被牠咬爛了。",
      choices: [
        { text: "給牠安全的啃咬玩具，把不想被咬、會危險的東西收好", ok: true, why: "聞、舔、咬是狗認識世界的方式，犬篇建議提供安全的啃咬玩具，並把東西收好。", source: DOG },
        { text: "以後出門就把牠關在籠子裡一整天", ok: false, why: "犬篇原則上不建議長期把狗養在籠子裡，就算暫時用籠子，也要讓牠每天出門運動。", source: DOG },
      ],
    },
    {
      prompt: "你在吃炸雞配洋蔥圈，牠坐在旁邊一直盯著你看。",
      choices: [
        { text: "分一小塊給牠，一點點沒關係", ok: false, why: "洋蔥可能危害狗的健康，太鹹、太油的食物也不適合牠。", source: DOG },
        { text: "把啃完的骨頭給牠", ok: false, why: "硬骨頭和剩菜裡的硬渣，可能傷到狗的嘴巴和消化道。", source: DOG },
        { text: "不給人吃的東西，餵牠平常吃的飼料", ok: true, why: "犬篇建議給品質合格、符合牠營養需求的飼料、罐頭或沒調味的鮮食。", source: DOG },
      ],
    },
    {
      prompt: "夏天中午，太陽很大，你想趁午休帶牠出去跑一跑。",
      choices: [
        { text: "照原計畫出門，多跑一點才會累", ok: false, why: "犬篇提醒天氣炎熱時避免帶狗出門，以免腳掌受傷或中暑。", source: DOG },
        { text: "改到不熱的時候再出門，記得讓牠補充水分", ok: true, why: "狗沒有汗腺，熱天散熱慢，犬篇建議外出避開炎熱、注意補充水分。", source: DOG },
      ],
    },
    {
      prompt: "牠今天吐了兩次，還一直拉肚子，看起來沒什麼精神。",
      choices: [
        { text: "先觀察幾天，說不定自己會好", ok: false, why: "嘔吐、腹瀉屬於比較嚴重的急症症狀，官方建議即時諮詢獸醫師。", source: DOG_QA },
        { text: "馬上聯絡動物醫院，請獸醫看看", ok: true, why: "出現嘔吐、腹瀉這類急症症狀時，應該即時諮詢獸醫師。", source: DOG_QA },
      ],
    },
    {
      prompt: "週末要出去玩兩天，沒辦法帶牠住飯店。",
      choices: [
        { text: "放滿飼料和水，讓牠自己在家", ok: false, why: "通則提醒出遊前要先安排好照顧，請寄養業者或親友幫忙。", source: GENERAL },
        { text: "請懂狗的親友或寄養業者照顧，交代清楚吃什麼、怎麼散步", ok: true, why: "通則建議出遊時把寵物託給專業寄養或親友，而且接手的人要懂照顧、知道牠的特殊需求。", source: GENERAL },
        { text: "帶牠一起出門，但到景點時讓牠在車上等", ok: false, why: "犬篇說不應該把狗單獨留在車內。", source: DOG },
      ],
    },
    {
      prompt: "散步時遇到另一隻狗，兩隻開始對著低吼。",
      choices: [
        { text: "慢慢拉開距離，緩慢走開", ok: true, why: "犬篇建議先拉開距離、放慢動作，等牠情緒平復再轉身離開。", source: DOG },
        { text: "鬆開牽繩，讓牠們自己解決", ok: false, why: "外出一定要有牽繩等防護，避免狗受刺激失控、衝撞或攻擊。", source: DOG },
        { text: "用力扯牽繩、大聲罵牠", ok: false, why: "犬篇建議避免過大的動作，用緩慢的移動來安撫牠的情緒。", source: DOG },
      ],
    },
  ],
  missed: "這一天沒人換水、也沒人帶牠出門；狗任何時候都需要乾淨的水，每天也至少要散步 20 到 30 分鐘。",
  articles: [
    { title: "帶寵物回家的第一個月，要做什麼？", url: "/articles/taiwan/animals/care-first-month/" },
    { title: "養寵物每天要花多少時間照顧？", url: "/articles/taiwan/animals/care-daily-time/" },
    { title: "養一隻寵物一年要花多少錢？", url: "/articles/taiwan/animals/care-annual-cost/" },
    { title: "認養前要準備什麼？", url: "/articles/taiwan/animals/before-adopting/" },
    { title: "公立收容所的認養流程是什麼？", url: "/articles/taiwan/animals/shelter-adoption-process/" },
    { title: "為什麼要幫寵物植入晶片？", url: "/articles/taiwan/animals/why-microchip/" },
    { title: "幫朋友照顧狗，交接時要問什麼、出狀況怎麼辦？", url: "/articles/taiwan/animals/pet-sitting-dog/" },
  ],
};

export default dog;
