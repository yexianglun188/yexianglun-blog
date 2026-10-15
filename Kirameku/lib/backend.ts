// 后端 API 的根地址（服务端专用，不会被打包进浏览器）。
//
// 本机开发：默认 http://127.0.0.1:8000，无需配置任何环境变量。
// Docker 部署：容器内的 127.0.0.1 是容器自己，必须用 compose service 名访问，
// 因此在部署环境里设置 BACKEND_ORIGIN=http://backend:8000。
//
// 浏览器侧的客户端组件不要直接引用本常量 —— 它们走相对路径 /api/*，
// 由 next.config.ts 的 rewrites 在服务端转发到这里的地址。
export const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN || "http://127.0.0.1:8000";
