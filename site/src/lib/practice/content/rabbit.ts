// 飼養體驗遊戲：兔子。照顧知識只取自飼養系列文章已引用的官方來源（CLAUDE.md §9）。
import type { SpeciesContent } from "../engine";

const RABBIT = { name: "農業部：兔飼養與照顧指南", url: "https://animal.moa.gov.tw/public/upload/Know_ArticleFile/26101604043916514196XR1.pdf" };
const RABBIT_QA = { name: "農業部動物保護資訊網：哺乳類動物飼養及照顧指南ＱＡ【兔隻篇】", url: "https://animal.moa.gov.tw/Frontend/Know/Detail/LT00000827?parentID=Tab0000126" };
const GENERAL = { name: "農業部：寵物飼養與照顧指南通則", url: "https://animal.moa.gov.tw/public/upload/Know_ArticleFile/251224011013327934ADK8J.pdf" };

const rabbit: SpeciesContent = {
  id: "rabbit",
  name: "兔子",
  tasks: [
    { id: "hay", text: "把牧草補滿", why: "乾草或新鮮牧草是兔子的主食，要隨時不限量供應，也能幫牠磨牙、促進腸胃蠕動。", source: RABBIT },
    { id: "water", text: "換乾淨的水", why: "兔指南建議提供乾淨的水並定期更換，兔子喝的水比一般狗、貓還多。", source: RABBIT },
    { id: "litter", text: "清理便盆", why: "便盆要定時清潔、墊料定期換，才不會發霉、滋生病菌和臭味。", source: RABBIT },
    { id: "exercise", text: "放牠出籠跑跳", why: "兔子活動量大，兔指南建議每天都給牠充分的籠外運動時間。", source: RABBIT },
    { id: "check", text: "看看牠吃了多少、便便多不多", why: "兔子天生會隱藏不舒服，要每天觀察食量、喝水量和排便，才能及早發現異常。", source: RABBIT },
  ],
  events: [
    {
      prompt: "你想把牠抱起來。",
      choices: [
        { text: "抓住耳朵或脖子把牠拎起來", ok: false, why: "兔指南說不可以從耳朵、脖子或四肢把兔子拎起來。", source: RABBIT },
        { text: "輕聲靠近，一手放在牠胸口、一手托住屁股，抱到胸前貼著你", ok: true, why: "這是兔指南寫的抱法：先緩慢輕聲靠近，再托住胸口和屁股，用身體撐住牠的背。", source: RABBIT },
        { text: "讓牠肚子朝上躺在你懷裡", ok: false, why: "肚子朝上仰躺會讓兔子很緊迫、嚇到不敢動。", source: RABBIT },
      ],
    },
    {
      prompt: "你想今天正餐都給牠吃紅蘿蔔。",
      choices: [
        { text: "好啊，兔子本來就愛吃紅蘿蔔", ok: false, why: "紅蘿蔔不是兔子的主食，只能少量吃，連同其他蔬菜加起來也只佔一小部分。", source: RABBIT_QA },
        { text: "主食還是牧草，紅蘿蔔只當蔬菜給一點點", ok: true, why: "兔指南建議牧草佔總進食量八成以上，蔬菜只佔一小部分。", source: RABBIT_QA },
      ],
    },
    {
      prompt: "放牠出籠玩，回頭發現牠在啃電線。",
      choices: [
        { text: "把電線收好，給牠樹枝、紙箱或木製玩具啃", ok: true, why: "啃咬是兔子的天性，兔指南建議避免牠接觸電線，並提供樹枝、紙箱、木製玩具讓牠玩。", source: RABBIT },
        { text: "打牠一下，讓牠記住不能咬", ok: false, why: "通則提醒，動物反應不如預期時不應該用責打的方式。", source: GENERAL },
      ],
    },
    {
      prompt: "這幾天很熱，你發現牠呼吸變快，耳朵摸起來燙燙的。",
      choices: [
        { text: "把籠子搬到陽台，讓牠吹吹風", ok: false, why: "高溫、陽光直曬或沒有陰影可以躲的地方，容易讓兔子中暑甚至死亡。", source: RABBIT },
        { text: "馬上加強通風、開冷氣降溫；如果牠也不太吃東西，儘快看醫生", ok: true, why: "兔子很怕熱，出現呼吸變快、耳朵變燙要馬上降溫；有食慾不振等疑似中暑症狀要儘速就醫。", source: RABBIT },
      ],
    },
    {
      prompt: "牠今天幾乎沒碰牧草，便盆裡的便便也比平常少很多。",
      choices: [
        { text: "再等一天看看，也許只是不餓", ok: false, why: "兔子突然吃得少、便便變少就要立刻找獸醫；完全不吃 12 小時就是非常危急的情形。", source: RABBIT_QA },
        { text: "馬上聯絡動物醫院", ok: true, why: "兔子突然排便量變少、食慾變差，應該立刻尋求獸醫師協助。", source: RABBIT_QA },
      ],
    },
    {
      prompt: "牠屁股附近的毛有點髒，你想幫牠洗澡。",
      choices: [
        { text: "放進浴室用沐浴乳好好洗一洗", ok: false, why: "兔指南建議避免幫兔子洗澡，除非牠沒辦法自己清理。", source: RABBIT },
        { text: "撒寵物乾洗粉擦一擦", ok: false, why: "兔指南說兔子不適合使用寵物乾洗粉。", source: RABBIT },
        { text: "先幫牠梳毛；如果牠真的沒辦法自己清理，就問獸醫", ok: true, why: "定期梳後腿和尾巴附近的毛可以預防皮膚感染；牠無法自己清理時，要請獸醫協助清潔。", source: RABBIT },
      ],
    },
    {
      prompt: "週末要出去玩兩天。",
      choices: [
        { text: "牧草和水放多一點，兩天很快就過了", ok: false, why: "通則提醒出遊前要先安排好照顧，請寄養業者或親友幫忙。", source: GENERAL },
        { text: "請懂兔子的親友或寄養業者照顧，交代清楚吃什麼、要觀察什麼", ok: true, why: "通則建議出遊時把寵物託給專業寄養或親友，而且接手的人要懂照顧、知道牠的特殊需求。", source: GENERAL },
      ],
    },
  ],
  missed: "這一天沒人補牧草、換水、清便盆；兔子需要隨時都有牧草吃，水也要乾淨、定期換。",
  articles: [
    { title: "帶寵物回家的第一個月，要做什麼？", url: "/articles/taiwan/animals/care-first-month/" },
    { title: "養寵物每天要花多少時間照顧？", url: "/articles/taiwan/animals/care-daily-time/" },
    { title: "養一隻寵物一年要花多少錢？", url: "/articles/taiwan/animals/care-annual-cost/" },
    { title: "認養前要準備什麼？", url: "/articles/taiwan/animals/before-adopting/" },
    { title: "幫朋友照顧兔子，交接時要問什麼、出狀況怎麼辦？", url: "/articles/taiwan/animals/pet-sitting-rabbit/" },
  ],
};

export default rabbit;
