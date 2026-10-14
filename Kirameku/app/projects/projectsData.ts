export interface Project {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  coverImage: string;
  techStack: string[];
  links: {
    github?: string;
    gitee?: string;
    live?: string;
    docs?: string;
  };
  featured?: boolean;
  status: "active" | "archived" | "developing";
  statusLabel: string;
}

// 项目展示为前端静态数据，新增项目直接在数组里加一条即可；
// coverImage 建议放 public/images/ 下的 webp（原模板的 /images/projects/ 目录不存在，会裂图）
export const projects: Project[] = [
  {
    id: "kirameku",
    name: "Kirameku 个人博客",
    description: "Next.js + FastAPI 前后端分离的全栈个人博客，就是你现在看的这个网站",
    longDescription:
      "从零搭建的全栈博客系统：前端 Next.js 16 + React 19 + Tailwind CSS 4，后端 FastAPI + SQLModel + PostgreSQL，管理后台 Vue 3 + Element Plus（vue-pure-admin）。包含文章（Markdown/目录/评论）、说说、照片墙、留言板、音乐播放器、小说阅读、工具箱（36 个工具 + 18 个小游戏）、站点子站（18 个实验页面）等模块；自研本地账号体系（注册/登录/访客三态）与访客机器人识别，支持一键部署脚本与内网穿透公网访问。",
    coverImage: "/images/42.webp",
    techStack: [
      "Next.js 16",
      "React 19",
      "TypeScript",
      "Tailwind CSS 4",
      "FastAPI",
      "SQLModel",
      "PostgreSQL",
      "Vue 3",
    ],
    links: {
      github: "https://github.com/yexianglun188/Kirameku",
    },
    featured: true,
    status: "active",
    statusLabel: "持续迭代中",
  },
];
