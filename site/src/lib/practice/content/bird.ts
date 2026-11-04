// 飼養體驗遊戲：鳥（taiwan，以鸚鵡等常見寵物鳥為主）。來源與飼養系列、臨時照顧系列文章相同（CLAUDE.md §9）。
import type { SpeciesContent } from "../engine";

const BIRD = {
  name: "農業部：寵物飼養與照顧指南－鳥類篇",
  url: "https://animal.moa.gov.tw/public/upload/Know_ArticleFile/2512240132583606997GC9T.pdf",
};

const content: SpeciesContent = {
  id: "bird",
  name: "鳥",
  tasks: [
    { id: "food", text: "補飼料，看看牠真的吃了多少", why: "鳥的代謝很快，得一直吃東西；吃種子的鳥，碗裡剩的殼容易讓你誤以為牠有吃。", source: BIRD },
    { id: "water", text: "換水、洗水碗", why: "指南建議每天換水、清洗容器，讓牠隨時有乾淨的水喝。", source: BIRD },
    { id: "cage", text: "清理籠子", why: "鳥吃東西會把殘渣和殼甩出來，大多也不會定點上廁所，籠子要每天清。", source: BIRD },
    { id: "check", text: "看看牠的精神、食量和便便", why: "鳥很會隱藏病痛，病情又變化得快，每天看行為、食量和排泄才掌握得到。", source: BIRD },
    { id: "company", text: "陪牠玩一會兒", why: "鸚鵡這類攀禽很需要互動，只養一隻的話，每天都要花足夠的時間陪牠。", source: BIRD },
  ],
  events: [
    {
      prompt: "第一天，要把鳥籠放在哪裡？窗邊陽光很好。",
      choices: [
        { text: "放在不會被太陽直曬、也不會吹到冷風的安靜地方", ok: true, why: "鳥對溫度變化很敏感，籠子要避開陽光直曬和冷風灌入的位置，也不要放在吵雜的地方。", source: BIRD },
        { text: "就放窗邊，讓牠整天曬太陽", ok: false, why: "適當曬太陽有幫助，但夏天的陽光可能讓鳥中暑。", source: BIRD },
      ],
    },
    {
      prompt: "你想煎個蛋，家裡的平底鍋是鐵氟龍不沾鍋。",
      choices: [
        { text: "換一個不是鐵氟龍的鍋子", ok: true, why: "鐵氟龍鍋在高溫下產生的氣體會讓鳥中毒，可能很快就死亡。", source: BIRD },
        { text: "開抽油煙機就沒問題", ok: false, why: "指南提醒，有養鳥的家裡千萬不要用鐵氟龍不沾鍋。", source: BIRD },
      ],
    },
    {
      prompt: "你在吃巧克力蛋糕，牠湊過來好像很想吃。",
      choices: [
        { text: "不給，改給牠平常的飼料", ok: true, why: "巧克力、酪梨、含咖啡因或酒精的東西和太鹹的食物都對鳥有害。", source: BIRD },
        { text: "給一小口就好", ok: false, why: "鳥大多分不出哪些食物會傷身體，要由你確保牠吃的東西安全無害。", source: BIRD },
      ],
    },
    {
      prompt: "想讓牠出籠飛一飛。",
      choices: [
        { text: "只在門窗關好的封閉空間裡開籠", ok: true, why: "指南提醒寵物鳥飛失的結果往往是付出生命，不要在非封閉空間放飛。", source: BIRD },
        { text: "帶到公園放飛，牠飛累了會回來", ok: false, why: "就算在家裡喚回練得很好，也不應該在開放空間放飛，飛走的鳥往往活不下來。", source: BIRD },
      ],
    },
    {
      prompt: "牠飛羽長了，你擔心牠飛走，想自己幫牠剪一剪。",
      choices: [
        { text: "不剪，靠關好門窗、籠門加安全扣來防飛走", ok: true, why: "剪羽只能在有醫療或特殊照護需求時，照獸醫師的醫囑做；有些鸚鵡會自己開籠門，指南建議加裝安全扣。", source: BIRD },
        { text: "自己剪短一點比較保險", ok: false, why: "翅膀也幫鳥維持平衡，飛羽缺了會影響日常活動，遇到危險也逃不掉。", source: BIRD },
      ],
    },
    {
      prompt: "今天牠澎著毛縮在籠底，一直在睡，飼料也沒怎麼吃。",
      choices: [
        { text: "盡快聯絡會看鳥的獸醫", ok: true, why: "澎毛、站不上棲木、睡得比平常多、食慾下降，指南都列為要積極找獸醫的徵兆。", source: BIRD },
        { text: "先等兩天，看會不會自己好", ok: false, why: "鳥很會隱藏病痛，病情又發展得很快，常讓人措手不及。", source: BIRD },
      ],
    },
    {
      prompt: "明天要出門一整天，晚上才會回家。",
      choices: [
        { text: "出門前把飼料和水都備足", ok: true, why: "鳥必須不斷進食，食物不夠可能在很短時間內就致命。", source: BIRD },
        { text: "鳥那麼小，早上給一點點就夠了", ok: false, why: "鳥的基礎代謝率高，沒有充足的食物，可能很快就有致命的影響。", source: BIRD },
      ],
    },
  ],
  missed: "沒人來的這一天，飼料和水都沒人補；鳥的代謝很快、必須一直吃東西，食物不夠可能在很短時間內就致命。",
  articles: [
    { title: "帶寵物回家的第一個月，要做什麼？", url: "/articles/taiwan/animals/care-first-month/" },
    { title: "養寵物每天要花多少時間照顧？", url: "/articles/taiwan/animals/care-daily-time/" },
    { title: "養一隻寵物一年要花多少錢？", url: "/articles/taiwan/animals/care-annual-cost/" },
    { title: "幫朋友照顧鳥，交接時要問什麼、出狀況怎麼辦？", url: "/articles/taiwan/animals/pet-sitting-bird/" },
  ],
};

export default content;
