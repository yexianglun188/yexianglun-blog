// siteConfig.ts - 全站配置中心

// 自定义歌曲：想放"自己喜欢的歌"用这个，音乐文件自己掌控，不受平台版权限制
export type CustomTrack = {
  id?: string;
  title: string;
  artist: string;
  cover?: string;
  src: string;
  lrc?: string;
};

export const siteConfig = {
  // 网站标题与博主信息
  title: "yexianglun小站",
  // 站点公网地址（用于 RSS/OG/sitemap 等绝对链接）
  // 2026-10-15 起部署在云服务器：http://122.51.90.31（见 deploy/README.md）
  // 绑定域名后改这里并重新构建前端 —— 这个值是编译进产物的，改完必须 next build
  url: "http://122.51.90.31",
  authorName: "yexianglun",
  bio: "在读学生 ｜ 主攻 Java 后端，也在折腾全栈。项目开源在 GitHub，欢迎 star 和 fork！(◕‿◕)",
  // 个性签名（显示在「关于我」页面头像下方）
  signature: "我会找到逆转时间的公式",

  // 关于页「双击头像」彩蛋
  // 双击头像会触发时间倒流动画，并念出下面这句。
  // speak 用的是浏览器内置语音合成（零依赖），音色是系统中文女声；
  // rate / pitch 可以微调听感（rate 越小越慢，pitch 越大越尖）。
  avatarEasterEgg: {
    line: "我找到了逆转时间的公式：把每一天都过成值得回看的样子",
    speak: true,
    rate: 0.9,
    pitch: 1.05,
    // 配音音频。放 public/audio/ 下即可生效；
    // 留空或文件不存在时会自动退回浏览器内置语音合成。
    // 当前用的是「通用克隆模型 B」—— 基于你提供的优菈语音做零样本克隆，
    // 基频中位 247Hz（与原型 245Hz 一致），音色亮度 1588Hz（原声 1552Hz）。
    // 想换版本直接替换 public/audio/avatar-line.mp3 即可，不用改这里。
    //
    // ⚠️ public/audio/ 整个目录已在 .gitignore 中（见该文件「版权素材」一节）：
    //    克隆音与原始参考音都源自他人作品，不进公开仓库。
    //    clone 仓库后此文件不存在 → 自动降级为浏览器语音合成，功能正常，只是音色不同。
    voiceClip: "/audio/avatar-line.mp3",
  },

  // ── 情书彩蛋文案（/love 页，需先在首页搜索框输入摩斯密码解锁）──
  // 想改内容只动这里，不用碰 app/love/page.tsx。
  // 主题呼应《不能说的秘密》：摩斯密码解锁的这封信，本身就是那封「不能说的秘密」。
  loveLetter: {
    title: "你找到了这封信",
    lines: [
      "致走到这里的你：",
      "这个站叫 yexianglun，",
      "取自《不能说的秘密》里，那个弹钢琴的男生。",
      "那部电影里有一首曲子叫 Secret，",
      "弹得快一点，就能回到过去。",
      "而你把摩斯密码敲进搜索框的那一刻，",
      "大概也算找到了那张旧琴谱。",
      "从琴房到教室是一百零八步，",
      "我不知道你绕了多远才走到这里，",
      "但谢谢你愿意走完。",
      "愿你也能找到属于自己的那首曲子 ——",
      "在心里，悄悄弹给自己听。",
      "—— yexianglun",
    ],
    // 未解锁时看到的提示
    lockedText: "这里什么都没有，也许你还没有找到那把钥匙。",
    lockedTip: "提示：答案就藏在我关于页的最后一行。",
    button: "回赠一颗星 ✨",
    buttonToast: "这封信，会一直在这里等你 💫",
    // 背景音乐：进入这封信时循环播放，离开页面自动停止。
    // 直接替换 public/audio/love-bgm.mp3 即可换曲，不用改代码。
    //
    // ⚠️ 《路小雨》为受版权保护的商业音乐，故 public/audio/ 不入库（见 .gitignore）。
    //    clone 仓库后需自备音频；缺失时静默无 BGM，不影响页面其它功能。
    bgm: "/audio/love-bgm.mp3",
    bgmVolume: 0.4,
  },

  // 生日（用于生日彩蛋）。两种写法二选一，都留空则关闭：
  //   birthdayLunar: "8-18"      农历八月十八 —— 推荐，每年自动换算成对应公历日
  //   birthday:      "2000-10-14" 公历，只比较「月-日」，年份仅占位
  // birthdayLunar 优先。换算表见 lib/lunar.ts（1900~2098）。
  birthdayLunar: "8-18",
  birthday: "",

  // 天气彩蛋：按天气让全站飘雪/飘雨（晴/阴/雾不触发，避免糊住背景）
  //   ""      = 按访客 IP 自动定位（推荐，每个访客看到自己所在地的天气）
  //   "off"   = 彻底关闭
  //   "北京"   = 固定城市
  weatherCity: "",

  // 头像设置
  avatarUrl: "/images/hong.jpg",

  // 背景设置
  useGradient: false,
  themeColors: ["#a18cd1", "#fbc2eb", "#a1c4fd", "#c2e9fb"],
  bgImages: [
    "/images/1.webp",
    "/images/42.webp",
    "/images/20.webp",
    "/images/36.webp",
    "/images/39.webp",
    "/images/41.webp",
  ],

  // 默认封面图
  defaultPostCover: "/images/default-cover.jpg",

  // 照片墙预览图
  photoWallImage: "/images/photo-wall.jpg",

  // ── 云音乐配置 ──────────────────────────────────────────────
  // platform 可选值：netease(网易云) | tencent(QQ音乐) | kugou | baidu | kuwo
  //
  // ⚠️ 关于 QQ 音乐（tencent）：实测能拉到歌单信息、封面、歌词，
  //    但【播放链接取不到】（128k/320k 都返回空），这是平台版权限制，
  //    不是本项目的问题。所以下面另提供了 customTracks 方案。
  //
  // ⚠️ 也可以在管理后台 -> 站点配置 里加同名 key 动态覆盖，
  //    优先级高于此处写死的值。
  //
  // 填歌单 ID 则自动拉取整个歌单，填歌曲 ID 列表则只播放指定歌曲
  cloudMusicPlatform: "netease",        // 平台标识
  cloudMusicPlaylistId: "17943739323",  // 歌单 ID（优先）
  cloudMusicIds: [],                    // 歌曲 ID 列表（歌单为空时使用）

  // ── 自定义歌曲（推荐：想放自己喜欢的歌用这个）──────────────
  // 用法：1) 把 mp3 文件放进 public/music/ 目录
  //       2) 按下面格式添加条目
  // 每条目字段：title(必填) artist(必填) src(必填,音频地址) cover(可选) lrc(可选,歌词) id(可选)
  // 支持本地文件，也支持任意外部音频直链。会自动排在最前面播放。
  // 示例条目（取消注释即可用）：
  //   { id: "my-1", title: "晴天", artist: "周杰伦",
  //     cover: "/images/default-cover.jpg", src: "/music/qingtian.mp3", lrc: "" }
  customTracks: [] as CustomTrack[],

  // 后端 API 地址（留空，开发通过 next.config.ts rewrites 代理，生产通过 Nginx 反代）
  apiBaseUrl: "",

  // 社交链接（留空则首页名片上不显示对应图标）
  social: {
    github: "https://github.com/yexianglun188",
    gitee: "",
    email: "3149980561@qq.com",
    qq: "3149980561",
    wechat: "",
  },

  // 站点信息
  // buildDate 仍被「花园」页用于计算建站天数，勿删
  buildDate: "2026-05-07T12:00:00",
  footerBadges: [
    { name: "Next.js 15", color: "text-sky-500" },
    { name: "React 19", color: "text-cyan-400" },
    { name: "Tailwind 4", color: "text-teal-400" },
  ],
  // 注：原先的 icpConfig / moeIcpConfig（赣ICP备/萌ICP备）属于原模板作者，
  // 已按要求从页脚移除并删除配置。若你日后申请了自己的备案号，
  // 在这里加回同名配置、并在 components/widgets/SiteDashboard.tsx 里恢复渲染即可。

  // 分类标题
  chatterTitle: "留言",
  chatterDescription: "生活、技术、随想的碎片记录",
};
