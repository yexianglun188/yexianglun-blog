-- 002：音乐表（支持网易云 / QQ 音乐双平台）
-- 背景：原先"手工挑选的歌曲"只存在 site_config 的 JSON 里，
--       且隐含只能是网易云。QQ 音乐的 songmid 是字符串、播放链接有时效，
--       需要独立的表结构来承载 platform / songmid / 可空 media_url。
--
-- 注意：如果后端已经用 SQLModel create_all 建过表（不带 server default），
--       下面的 ALTER 负责补齐默认值，保证裸 SQL / 外部工具也能插入。

CREATE TABLE IF NOT EXISTS music (
    id          SERIAL PRIMARY KEY,
    platform    VARCHAR(16)  NOT NULL DEFAULT 'netease',
    song_id     VARCHAR(64)  NOT NULL,           -- 网易云: 数字id；QQ: songmid
    name        VARCHAR(200) NOT NULL,
    artist      VARCHAR(200) NOT NULL DEFAULT '',
    album       VARCHAR(200) NOT NULL DEFAULT '',
    cover       VARCHAR(500) NOT NULL DEFAULT '',
    duration    VARCHAR(16)  NOT NULL DEFAULT '',
    media_url   TEXT         NULL,               -- QQ 音乐动态 vkey，留空
    sort        INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 补齐默认值（兼容 create_all 已建表的情况）
ALTER TABLE music ALTER COLUMN platform SET DEFAULT 'netease';
ALTER TABLE music ALTER COLUMN artist   SET DEFAULT '';
ALTER TABLE music ALTER COLUMN album    SET DEFAULT '';
ALTER TABLE music ALTER COLUMN cover    SET DEFAULT '';
ALTER TABLE music ALTER COLUMN duration SET DEFAULT '';
ALTER TABLE music ALTER COLUMN sort     SET DEFAULT 0;
ALTER TABLE music ALTER COLUMN created_at SET DEFAULT now();

-- 同一平台下同一首歌唯一，防止重复入库
CREATE UNIQUE INDEX IF NOT EXISTS uq_music_platform_song
    ON music (platform, song_id);

CREATE INDEX IF NOT EXISTS ix_music_sort ON music (sort DESC, id ASC);

-- 数据迁移：把 site_config 里已有的网易云歌曲搬进新表
-- cloud_music_meta 形如 [{"id":"1","name":"晴天","artist":"周杰伦"}]
INSERT INTO music (platform, song_id, name, artist, album, cover, duration, media_url, sort)
SELECT
    'netease',
    elem->>'id',
    COALESCE(elem->>'name', '未知歌曲'),
    COALESCE(elem->>'artist', ''),
    '',
    '',
    '',
    NULL,
    ROW_NUMBER() OVER (ORDER BY ordinality) AS sort
FROM site_config,
     jsonb_array_elements(value::jsonb) WITH ORDINALITY AS t(elem, ordinality)
WHERE key = 'cloud_music_meta'
  AND elem->>'id' IS NOT NULL
ON CONFLICT (platform, song_id) DO NOTHING;
