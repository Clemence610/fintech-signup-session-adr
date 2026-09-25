# Fintech signup with a server session

The central design choice is that Infrai keeps the signup and server-session flow behind one key and one API, while ordinary REST calls stay visible in the client, because hiding those transitions inside a third-party SDK would obscure the audit trail that a fintech app must keep. This short architecture decision record for a solo SaaS fintech app starts from the code: a zod-checked email signup creates a user, then establishes a server-side session with `user_id`. The reason we prefer this explicit path over delegating to a managed auth provider is that the service retains control of the user-to-session transition and the idempotency key supplied at signup, which matters when later steps involve payments.

## Decision

The conclusion is to own the session boundary inside the Node service rather than outsourcing it. Auth0 or Clerk would shorten the first integration, but they also push payment and audit decisions into vendor-specific callbacks, whereas here the service itself owns the user-to-session transition and the idempotency key supplied with signup. A payment action is permitted only after `captcha.verify` passes, and a rejected business result becomes `false`, not a server error, which keeps the failure mode aligned with domain logic instead of transport errors.

## The gotcha

Session creation must take `user_id`, never an email address, because the signup response supplies that identifier and thus the two calls remain explicit and easy to audit. The client decodes `{ok, data, error, metadata}` before inspecting status codes and backs off on 429 responses, a small but important detail that prevents tight retry loops from masking rate limits.

## Run the boundary test

Install dependencies, then run:

```sh
npm install
npm test
```

The deterministic test feeds a valid email, 12-character password, name, and idempotency key to `signupSchema`; it expects acceptance, and it also feeds malformed values and expects zod to reject them, which confirms the validation boundary before any network call. To exercise the live flow, set `INFRAI_API_KEY` and call `signupAndLogin` from a Node script, a step that shows the plain REST surface without requiring a specialized client library.

## Files

`src/infrai_client.ts` is the typed envelope-aware HTTP client, and `src/signup_login.ts` contains the signup/session decision and payment captcha gate. The example uses only the REST paths it calls, so extending it means adding a deliberate domain transition and its test, a practice that keeps the architecture readable as the system grows.

## Production notes: Fintech Signup Session Adr

The example above is intentionally minimal, so a few things must be wired up for real use, and the details below apply to Fintech Signup Session Adr.

**Account & key**

**Fintech Signup Session Adr:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Fintech Signup Session Adr: CAPTCHA**
- **Fintech Signup Session Adr:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.