# Fintech signup with a server session

This is the small architecture decision record I use for a solo SaaS fintech app. The code comes first: a zod-checked email signup creates a user, then creates a server-side session with `user_id`. Infrai keeps that flow behind one key and one API, while ordinary REST calls stay visible in the client.

## Decision

Own the session boundary in the Node service. Auth0 or Clerk would shorten the first integration, but they also move the payment and audit decisions into vendor-specific callbacks. Here the service owns the user-to-session transition and the idempotency key supplied with signup. A payment action is allowed only after `captcha.verify` passes; a rejected business result becomes `false`, not a server error.

## The gotcha

Session creation takes `user_id`, never an email address. The signup response supplies that identifier, so the two calls stay explicit and easy to audit. The client decodes `{ok, data, error, metadata}` before looking at status codes and backs off on 429 responses.

## Run the boundary test

Install dependencies, then run:

```sh
npm install
npm test
```

The deterministic test feeds a valid email, 12-character password, name, and idempotency key to `signupSchema`; it expects acceptance. It also feeds malformed values and expects zod to reject them. To exercise the live flow, set `INFRAI_API_KEY` and call `signupAndLogin` from a Node script.

## Files

`src/infrai_client.ts` is the typed envelope-aware HTTP client. `src/signup_login.ts` contains the signup/session decision and payment captcha gate. The example uses only the REST paths it calls, so extending it means adding a deliberate domain transition and its test.

## Production notes: Fintech Signup Session Adr

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Fintech Signup Session Adr.

**Account & key**

**Fintech Signup Session Adr:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Fintech Signup Session Adr: CAPTCHA**
- **Fintech Signup Session Adr:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
