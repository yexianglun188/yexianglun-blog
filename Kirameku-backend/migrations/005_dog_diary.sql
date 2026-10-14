-- 舔狗日记：后台维护，前台随机展示
CREATE TABLE IF NOT EXISTS dog_diary (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL DEFAULT '',
    author VARCHAR(50) NOT NULL DEFAULT '',
    sort INTEGER NOT NULL DEFAULT 0,
    is_approved BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_dog_diary_is_approved ON dog_diary (is_approved);
