// 飼養體驗遊戲：倉鼠（taiwan）。來源與飼養系列、臨時照顧系列文章相同（CLAUDE.md §9）。
import type { SpeciesContent } from "../engine";

const QA = {
  name: "農業部動物保護資訊網：哺乳類動物飼養及照顧指南ＱＡ【倉鼠篇】",
  url: "https://animal.moa.gov.tw/Frontend/Know/Detail/LT00000829?parentID=Tab0000126",
};
const MAMMAL = {
  name: "農業部：寵物飼養與照顧指南－哺乳類篇",
  url: "https://animal.moa.gov.tw/public/upload/Know_ArticleFile/251224011700058845FQRR5.pdf",
};
const LAW = {
  name: "全國法規資料庫：動物保護法（修正日期民國 110 年 5 月 19 日）",
  url: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=M0060027",
};

const content: SpeciesContent = {
  id: "hamster",
  name: "倉鼠",
  tasks: [
    { id: "water", text: "確認有乾淨的水", why: "倉鼠喝得不多，但《動物保護法》要飼主提供 24 小時充足、乾淨的飲水。", source: LAW },
    { id: "food", text: "給固定份量的飼料", why: "倉鼠會挑飼料裡的堅果先吃，每天固定份量，牠才不會養成挑食的習慣。", source: MAMMAL },
    { id: "bedding", text: "換掉牠上廁所那個角落的墊料", why: "大部分倉鼠會在籠子的某個角落上廁所，那一區的墊料要常換。", source: QA },
    { id: "door", text: "確認籠子關好", why: "指南要倉鼠一定關籠養，以免牠咬斷電線，危及生命。", source: QA },
    { id: "chew", text: "確認籠裡有木塊或磨牙棒", why: "倉鼠的門牙一直長，有東西啃能降低門牙太長的風險。", source: QA },
    { id: "night", text: "晚上看看牠活動和吃東西的樣子", why: "倉鼠是夜行性動物，晚上活動正常，白天躲著睡就不用擔心。", source: QA },
  ],
  events: [
    {
      prompt: "白天牠一直躲在窩裡睡，你想叫牠起來玩。",
      choices: [
        { text: "讓牠睡，晚上牠醒了再陪牠", ok: true, why: "倉鼠是夜行性動物，白天躲在墊料或小窩裡休息是正常的。", source: QA },
        { text: "輕輕搖一下籠子，把牠叫醒", ok: false, why: "要尊重倉鼠活動和休息的習慣，不應該強迫牠配合你的作息。", source: MAMMAL },
      ],
    },
    {
      prompt: "店員說兩隻養在一起比較不寂寞，要不要再買一隻放進同一籠？",
      choices: [
        { text: "不要，一隻一籠", ok: true, why: "大部分倉鼠領域性很強，陌生的倉鼠碰在一起容易嚴重打架。", source: QA },
        { text: "好啊，有伴比較快樂", ok: false, why: "黃金鼠是獨居動物，對同類特別兇，不應該跟其他倉鼠一起養。", source: QA },
      ],
    },
    {
      prompt: "夏天下午家裡很悶熱。",
      choices: [
        { text: "開電扇或冷氣，讓房間涼下來", ok: true, why: "天熱時可以用電扇、冷氣降低倉鼠住的地方的溫度。", source: QA },
        { text: "牠會自己散熱，不用特別處理", ok: false, why: "倉鼠沒有汗腺，只能靠耳朵和尾巴散熱，很怕熱。", source: QA },
      ],
    },
    {
      prompt: "寒流來了，想幫牠保暖。",
      choices: [
        { text: "把暖暖包放在籠子外的底部", ok: true, why: "暖暖包放在籠外底部，牠碰不到，才不會咬破或燙傷。", source: QA },
        { text: "把暖暖包直接放進牠的小窩", ok: false, why: "倉鼠直接碰到暖暖包，可能誤食或燙傷。", source: QA },
      ],
    },
    {
      prompt: "清籠子時發現牠拉肚子了。",
      choices: [
        { text: "把籠子清乾淨，只給飼料和水、先停蔬菜和點心，並盡快帶去看獸醫", ok: true, why: "倉鼠腸胃很脆弱，一直拉肚子死亡風險很高，要盡快找獸醫。", source: QA },
        { text: "多給一點蔬菜，幫牠補水分", ok: false, why: "拉肚子時要給單純溫和的飲食，只給飼料，先停蔬菜和點心。", source: QA },
        { text: "先觀察幾天，說不定自己會好", ok: false, why: "倉鼠持續拉肚子死亡風險很高，不能拖。", source: QA },
      ],
    },
    {
      prompt: "你發現牠的門牙好像太長了，吃東西有點吃力。",
      choices: [
        { text: "帶去給會看倉鼠的獸醫看", ok: true, why: "門牙沒磨好會影響吃東西，還可能刺傷嘴巴，這是要盡快看獸醫的情況。", source: QA },
        { text: "沒關係，牙齒過幾天會自己磨掉", ok: false, why: "倉鼠的門牙會一直長，已經影響吃東西就不能等它自己好。", source: QA },
      ],
    },
    {
      prompt: "明天要出門一整天，晚上才會回家。",
      choices: [
        { text: "出門前換好水、給今天份量的飼料，再確認籠子關好", ok: true, why: "倉鼠很會從小縫逃脫，所以指南建議關籠養。", source: QA },
        { text: "讓牠在房間裡自由跑，比較不悶", ok: false, why: "倉鼠會啃咬東西磨牙，咬斷電線會危及牠的生命和居家安全。", source: QA },
      ],
    },
  ],
  missed:
    "沒人來的這一天，水沒換、飼料也沒補；倉鼠喝得不多，但法律要求飼主讓牠 24 小時都有乾淨的水。",
  articles: [
    { title: "帶寵物回家的第一個月，要做什麼？", url: "/articles/taiwan/animals/care-first-month/" },
    { title: "養寵物每天要花多少時間照顧？", url: "/articles/taiwan/animals/care-daily-time/" },
    { title: "養一隻寵物一年要花多少錢？", url: "/articles/taiwan/animals/care-annual-cost/" },
    { title: "幫朋友照顧倉鼠，交接時要問什麼、出狀況怎麼辦？", url: "/articles/taiwan/animals/pet-sitting-hamster/" },
  ],
};

export default content;
