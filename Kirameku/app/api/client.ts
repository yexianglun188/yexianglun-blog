import { siteConfig } from "@/siteConfig";

const BASE_URL = siteConfig.apiBaseUrl;

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
      else if (typeof body?.message === "string") detail = body.message;
      else if (Array.isArray(body?.detail)) detail = body.detail[0]?.msg ?? "";
    } catch {
      // 响应体不是 JSON，忽略
    }
    throw new ApiError(detail || `请求失败（${res.status}）`, res.status);
  }
  return res.json();
}

function qs(params?: Record<string, string | number | undefined>): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== ""
  );
  if (!entries.length) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export { request, qs, ApiError, BASE_URL };
