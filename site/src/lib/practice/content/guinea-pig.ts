// 飼養體驗遊戲：天竺鼠（taiwan）。來源與飼養系列、臨時照顧系列文章相同（CLAUDE.md §9）。
import type { SpeciesContent } from "../engine";

const QA = {
  name: "農業部動物保護資訊網：哺乳類動物飼養及照顧指南ＱＡ【天竺鼠篇】",
  url: "https://animal.moa.gov.tw/Frontend/Know/Detail/LT00000828?parentID=Tab0000126",
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
  id: "guinea-pig",
  name: "天竺鼠",
  tasks: [
    { id: "hay", text: "把牧草放滿", why: "天竺鼠的牙齒會一直長，要隨時有乾草或新鮮牧草可以咬，才磨得到牙。", source: QA },
    { id: "water", text: "換新鮮的水", why: "《動物保護法》要飼主提供 24 小時充足、乾淨的飲水。", source: LAW },
    { id: "veggie", text: "給天竺鼠專用飼料和新鮮蔬菜", why: "天竺鼠自己不會製造維生素 C，要靠專用飼料和蔬菜補，但這部分不超過每天食量的 20%。", source: QA },
    { id: "clean", text: "清理尿盆和看護墊", why: "天竺鼠尿尿便便的量很大，大多不會定點上廁所，在牠愛蹲的角落和食物旁放尿盆，清起來比較快。", source: QA },
    { id: "check", text: "看看牠吃了多少、便便和尿的樣子", why: "指南建議每天留意食量、喝水量、排便和排尿，有異常才能早點發現。", source: MAMMAL },
    { id: "temp", text: "確認室溫在 18 到 26 度之間", why: "天竺鼠沒有汗腺，超過 26 度就有中暑的風險。", source: QA },
  ],
  events: [
    {
      prompt: "第一天，家裡剛好有一包兔子飼料，可以先拿來餵嗎？",
      choices: [
        { text: "先給牧草，再去買天竺鼠專用飼料", ok: true, why: "兔子、貓、狗的飼料裡有天竺鼠消化不了的動物性蛋白質和穀物，要吃天竺鼠專用的。", source: QA },
        { text: "可以，兔子跟天竺鼠都吃草", ok: false, why: "兔子飼料裡有天竺鼠消化不了的成分，不能拿來代替。", source: QA },
        { text: "家裡也有倉鼠飼料，那個也行", ok: false, why: "天竺鼠是草食動物，吃寵物鼠的穀物飼料會影響腸胃健康。", source: QA },
      ],
    },
    {
      prompt: "傍晚牠在籠子裡跑來跑去，想讓牠出來跑一跑。",
      choices: [
        { text: "用 30 公分以上的圍片圍出一塊地方，放個能躲的小屋", ok: true, why: "指南建議用 30 公分以上的圍片隔出活動空間，並給牠足夠的地方躲。", source: QA },
        { text: "直接放在客廳地上，讓牠自己到處跑", ok: false, why: "讓寵物到籠外活動要先確認空間安全，陌生的環境也可能讓牠緊張。", source: MAMMAL },
      ],
    },
    {
      prompt: "下午家裡很熱，牠側躺著，呼吸很急，還在流口水。",
      choices: [
        { text: "馬上開冷氣或電扇降溫，同時打電話給獸醫", ok: true, why: "呼吸急促、側躺、流口水是中暑的徵兆，要儘快降溫，避免中暑或熱衰竭。", source: QA },
        { text: "幫牠沖冷水降溫", ok: false, why: "天竺鼠不擅長游泳、容易受驚，毛沒吹乾容易失溫，沒有獸醫指示不要幫牠洗澡。", source: MAMMAL },
        { text: "牠可能只是累了，讓牠睡一下", ok: false, why: "天竺鼠沒有汗腺，熱到出現這些症狀就要儘快處理，不能等。", source: QA },
      ],
    },
    {
      prompt: "牠的毛看起來有點髒，想幫牠洗個澡。",
      choices: [
        { text: "不洗，牠會自己理毛；真的髒到弄不掉，就修掉髒的那一小撮", ok: true, why: "大部分哺乳類寵物能自己保持乾淨，毛真的髒到清不掉時，可以適度修剪髒掉的部分。", source: MAMMAL },
        { text: "用溫水洗，洗完再吹乾", ok: false, why: "天竺鼠容易受驚，毛沒吹乾容易失溫或感冒，沒有獸醫指示不應該幫牠洗澡。", source: MAMMAL },
      ],
    },
    {
      prompt: "只養一隻好像很孤單，想幫牠找個伴。",
      choices: [
        { text: "再養一隻天竺鼠，先讓牠們慢慢熟悉，再放進同一籠", ok: true, why: "天竺鼠社交需求高，但陌生的天竺鼠碰在一起會打架，合籠前要給牠們時間熟悉彼此。", source: QA },
        { text: "新買的天竺鼠直接放進同一籠", ok: false, why: "兩隻以上陌生的天竺鼠放在一起，有打架的風險。", source: QA },
        { text: "讓牠跟朋友家的兔子作伴", ok: false, why: "兔子的行為容易讓天竺鼠緊張，不可以養在一起。", source: QA },
      ],
    },
    {
      prompt: "這兩天牠吃得比平常少，還一直流口水。",
      choices: [
        { text: "盡快帶去給會看天竺鼠的獸醫看", ok: true, why: "食慾變差、流口水可能是缺乏維生素 C 或牙齒出了問題，指南說要盡快找獸醫。", source: QA },
        { text: "多給牠苜蓿草，牠比較愛吃", ok: false, why: "苜蓿草這類鈣磷比高的食物容易讓天竺鼠長結石。", source: QA },
        { text: "再觀察一個禮拜", ok: false, why: "牙齒有問題會讓牠沒辦法正常吃東西，這是要盡快看獸醫的情況。", source: QA },
      ],
    },
    {
      prompt: "明天要出門一整天，晚上才會回家。",
      choices: [
        { text: "出門前把牧草放滿、水換好，天熱就讓室溫維持在 26 度以下", ok: true, why: "天竺鼠要隨時有牧草磨牙，室溫超過 26 度又有中暑風險。", source: QA },
        { text: "放一小碗飼料就好，回來再補牧草", ok: false, why: "天竺鼠的牙齒一直在長，就算牧草不好保存，也要讓牠隨時拿得到。", source: QA },
      ],
    },
  ],
  missed:
    "沒人來的這一天，牧草吃完沒人補、水也沒人換；天竺鼠的牙齒一直在長，需要隨時有牧草可以咬，法律也要求飼主讓牠 24 小時都有乾淨的水。",
  articles: [
    { title: "帶寵物回家的第一個月，要做什麼？", url: "/articles/taiwan/animals/care-first-month/" },
    { title: "養寵物每天要花多少時間照顧？", url: "/articles/taiwan/animals/care-daily-time/" },
    { title: "養一隻寵物一年要花多少錢？", url: "/articles/taiwan/animals/care-annual-cost/" },
    { title: "幫朋友照顧天竺鼠，交接時要問什麼、出狀況怎麼辦？", url: "/articles/taiwan/animals/pet-sitting-guinea-pig/" },
  ],
};

export default content;
