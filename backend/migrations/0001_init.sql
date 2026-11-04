-- doorbell.life backend 初始資料表。不存 IP、不存訪客任何資料；token 與 session 只存 SHA-256 雜湊。

-- 曝光統計：抽樣 1/10，每筆 = 10 次顯示。主鍵即資料表（WITHOUT ROWID），upsert 只寫 1 列、沒有額外索引列。
CREATE TABLE impressions (
  host TEXT NOT NULL,
  date TEXT NOT NULL,          -- UTC，YYYY-MM-DD
  topic TEXT NOT NULL,
  country TEXT NOT NULL,       -- request.cf.country；取不到時 XX
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (host, date, topic, country)
) WITHOUT ROWID;

-- 品牌主帳號：第一次登入時建立。settings 是驗證過的 JSON。
CREATE TABLE brands (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  settings TEXT,
  created_at INTEGER NOT NULL  -- Unix 毫秒
);

-- 一次性登入 token：只存雜湊；同時是每個信箱 15 分鐘 3 次的限流紀錄。
CREATE TABLE login_tokens (
  hash TEXT PRIMARY KEY,       -- SHA-256 hex
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX login_tokens_email_created ON login_tokens (email, created_at);

-- 後台登入 session：只存雜湊，30 天。
CREATE TABLE sessions (
  hash TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands (id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

-- 品牌主宣告的網域：報表只算這些。
CREATE TABLE sites (
  brand_id TEXT NOT NULL REFERENCES brands (id) ON DELETE CASCADE,
  host TEXT NOT NULL,
  PRIMARY KEY (brand_id, host)
) WITHOUT ROWID;
