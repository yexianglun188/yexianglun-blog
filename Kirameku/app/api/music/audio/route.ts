/**
 * 音频流转发（前端侧）
 *
 * 为什么需要这一层：
 *   1. 音乐直链来自酷我 / 网易云等第三方 CDN，其中酷我（bd-*.kuwo.cn）
 *      不返回 Access-Control-Allow-Origin，浏览器 <audio> 直接加载会被 CORS 拦掉；
 *   2. 后端在 8000，公网只穿透了这个前端服务（3000），浏览器拿不到后端地址；
 *   3. 走 next.config 的 rewrites 转发 StreamingResponse 会挂住（代理层等不到结束），
 *      所以这里自己实现转发。
 *
 * 后端已把 CORS 头补好，这里只做透传：Range / 状态码 / Content-Type / 长度都要原样带回，
 * 否则 <audio> 无法 seek。
 */

const BACKEND = "http://127.0.0.1:8000";

// 与后端 app/api/music.py 的 _ALLOWED_AUDIO_HOSTS 保持一致
const ALLOWED_HOSTS = [
  "kuwo.cn",
  "music.126.net",
  "126.net",
  "qq.com",
  "kugou.com",
];

function hostAllowed(raw: string): boolean {
  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    return false;
  }
  return ALLOWED_HOSTS.some((d) => host === d || host.endsWith("." + d));
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url") || "";

  if (!/^https?:\/\//i.test(target)) {
    return new Response(JSON.stringify({ detail: "非法的音频地址" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!hostAllowed(target)) {
    return new Response(JSON.stringify({ detail: "该音频来源不在允许列表内" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers: Record<string, string> = { Accept: "*/*" };
  // Range 必须透传：<audio> 靠它做 seek，缺失时部分 CDN 行为不同
  const range = req.headers.get("range");
  if (range) headers.Range = range;

  try {
    const upstream = await fetch(`${BACKEND}/api/music/audio?url=${encodeURIComponent(target)}`, {
      headers,
      // 音频可能上百 MB，不能让 Next 自己超时
      cache: "no-store",
    });

    if (!upstream.ok && upstream.status !== 206) {
      return new Response(
        JSON.stringify({ detail: `后端返回 ${upstream.status}` }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const outHeaders = new Headers();
    outHeaders.set("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
    outHeaders.set("Access-Control-Allow-Origin", "*");
    outHeaders.set("Cache-Control", "public, max-age=300");
    for (const key of ["content-range", "content-length", "accept-ranges"]) {
      const v = upstream.headers.get(key);
      if (v) outHeaders.set(key, v);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ detail: `音频转发失败: ${(e as Error).message}` }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}