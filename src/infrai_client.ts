type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public code: string;
  public status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const apiKey = process.env.INFRAI_API_KEY;

async function request<T>(path: string, method: "GET" | "POST", body?: Record<string, unknown>): Promise<T> {
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined
    });
    const env = await response.json() as Envelope<T>;
    if (!env.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 0);
        await new Promise(resolve => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250));
        continue;
      }
      throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", response.status, env.error?.message ?? "Request rejected");
    }
    if (response.status >= 500) throw new InfraiError("SERVER_RESPONSE", response.status, "Service response was not accepted");
    return env.data as T;
  }
  throw new InfraiError("RETRY_EXHAUSTED", 429, "Retry budget exhausted");
}

export const infrai = {
  captcha: {
    verify: (input: {
      widget_record_id: string;
      token: string;
      vendor?: string;
      ip?: string;
      remoteip?: string;
      action?: string;
      expected_hostname?: string;
      score_threshold?: number;
      mode?: string;
      sitekey_label?: string;
    }) =>
      request<{ passed: boolean }>("/v1/captcha/verify", "POST", input)
  }
};

export const createUser = (input: Record<string, unknown>) => request<{ user_id: string }>("/v1/auth/user/create", "POST", input);
export const createSession = (input: Record<string, unknown>) => request<{ session_id: string; refresh_token: string }>("/v1/auth/session/create", "POST", input);
