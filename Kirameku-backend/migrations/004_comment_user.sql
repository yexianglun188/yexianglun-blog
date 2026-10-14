-- 004：评论 / 说说评论接入本地账号体系
-- 背景：文章评论（comment）、说说评论（chatter_comment）原先只绑定 GitHub OAuth 用户，
--   移除 GitHub 登录后需要支持本地注册账号。github_user_id 保留仅作历史数据兼容。

-- 1) comment.user_id
ALTER TABLE comment
    ADD COLUMN IF NOT EXISTS user_id INTEGER NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'comment_user_id_fkey'
    ) THEN
        ALTER TABLE comment
            ADD CONSTRAINT comment_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_comment_user_id ON comment(user_id);

-- 2) chatter_comment.user_id
ALTER TABLE chatter_comment
    ADD COLUMN IF NOT EXISTS user_id INTEGER NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chatter_comment_user_id_fkey'
    ) THEN
        ALTER TABLE chatter_comment
            ADD CONSTRAINT chatter_comment_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_chatter_comment_user_id ON chatter_comment(user_id);
