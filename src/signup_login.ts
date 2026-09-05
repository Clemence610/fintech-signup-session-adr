import { z } from "zod";
import { infrai, createUser, createSession, InfraiError } from "./infrai_client.js";

export const signupSchema = z.object({
  email: z.string().email(), password: z.string().min(12), name: z.string().min(1),
  metadata: z.record(z.string()).default({}), vendor: z.string().optional(), mode: z.string().optional(), idempotency_key: z.string().min(8)
});

export async function signupAndLogin(input: unknown) {
  const signup = signupSchema.parse(input);
  const user = await createUser(signup);
  const session = await createSession({ user_id: user.user_id, method: "password", require_mfa: false });
  return { userId: user.user_id, sessionId: session.session_id, refreshToken: session.refresh_token };
}

export async function allowPayment(input: { widget_record_id: string; token: string; userId: string; ip?: string }) {
  try {
    const result = await infrai.captcha.verify({ widget_record_id: input.widget_record_id, token: input.token, action: "payment", ip: input.ip, score_threshold: 0.7 });
    return result.passed;
  } catch (error) {
    if (error instanceof InfraiError && error.status < 500) return false;
    throw error;
  }
}

export type PaymentEvent = { userId: string; amount: number; currency: string; createdAt: string };

export function paymentNotification(event: PaymentEvent) {
  const riskSensitive = event.amount >= 1000;
  return { kind: riskSensitive ? "payment_review" : "payment_received", audit: { ...event, recordedAt: new Date().toISOString() } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("signup-login-fintech example loaded; call signupAndLogin with a validated request body");
}
