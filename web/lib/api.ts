const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(typeof body?.error === "string" ? body.error : JSON.stringify(body?.error) || "Request failed");
    this.status = status;
    this.body = body;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ab_token");
}

export async function api<T = any>(
  path: string,
  options: { method?: string; body?: any; auth?: boolean; formData?: FormData } = {}
): Promise<T> {
  const { method = "GET", body, auth = true, formData } = options;
  const headers: Record<string, string> = {};
  if (!formData) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: formData ? formData : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export { API_URL };
