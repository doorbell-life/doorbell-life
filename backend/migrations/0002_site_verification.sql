-- 品牌網域 DNS TXT 驗證（CLAUDE.md §13，2026-11-04）：報表只計入驗證過的網域。

-- 每個品牌固定的驗證碼（32 個 hex 字元）；TXT 值是 doorbell-life-verify={verify_code}。既有帳號在這裡補上。
ALTER TABLE brands ADD COLUMN verify_code TEXT;
UPDATE brands SET verify_code = lower(hex(randomblob(16))) WHERE verify_code IS NULL;
CREATE UNIQUE INDEX brands_verify_code ON brands (verify_code);

-- 網域驗證通過的時間（Unix 毫秒）；NULL 表示未驗證。
ALTER TABLE sites ADD COLUMN verified_at INTEGER;
