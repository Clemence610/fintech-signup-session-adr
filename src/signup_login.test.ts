import { signupSchema } from "./signup_login.js";

const valid = signupSchema.parse({ email: "founder@example.com", password: "correct horse battery", name: "Founder", idempotency_key: "signup-2026-09-02" });
if (valid.email !== "founder@example.com" || valid.metadata === undefined) throw new Error("signup boundary failed");
let rejected = false;
try { signupSchema.parse({ email: "bad", password: "short", name: "", idempotency_key: "x" }); } catch { rejected = true; }
if (!rejected) throw new Error("invalid signup should be rejected");
console.log("signup boundary: valid input accepted, invalid input rejected");
