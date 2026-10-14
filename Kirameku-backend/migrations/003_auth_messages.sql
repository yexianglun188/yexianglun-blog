-- 003：本地账号体系改造（注册 / 访客登录 / 留言归属）
-- 背景：留言板原先绑定 GitHub OAuth，现改为「本地注册账号 + 访客浏览」体系。
--   - user 表加 is_guest：标记访客身份（前台展示用，禁止留言）
--   - message 表加 user_id：留言归属本地账号；github_user_id 保留仅为兼容历史数据

-- 1) user.is_guest
ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) message.user_id（带外键，用 DO 块保证可重复执行）
ALTER TABLE message
    ADD COLUMN IF NOT EXISTS user_id INTEGER NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'message_user_id_fkey'
    ) THEN
        ALTER TABLE message
            ADD CONSTRAINT message_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_message_user_id ON message(user_id);

-- 3) 历史留言回填：无归属的保持 NULL（前端按「匿名用户」展示）
