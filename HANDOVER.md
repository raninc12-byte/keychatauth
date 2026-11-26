# DarkChat handover

DarkChat is a real-time chat site on Cloudflare Workers. It started as Cloudflare's OpenAuth login template, and the chat is built on top of that login system.

- **Live site:** https://keychatauth.3090.workers.dev/
- **Repository:** `raninc12-byte/keychatauth`. `main` deploys to production automatically.
- **Cloudflare Worker name:** `keychatauth`. The app is called DarkChat, but the Worker keeps its original name because Workers Builds is connected to it. Renaming it breaks the build.

## Current state (2026-11-26)

| What | Status |
| --- | --- |
| Chat, rooms, DMs, GIFs, video, 24-hour expiry ([#1](https://github.com/raninc12-byte/keychatauth/pull/1)) | **Merged and live** |
| Redesign, badges and verification, admin panel, custom 404 page ([#2](https://github.com/raninc12-byte/keychatauth/pull/2)) | **Open, not merged.** Checks pass, no conflicts, no open review comments. It goes live when merged. |
| `RESEND_API_KEY` secret (email codes) | **Not set.** Sign-up codes are only written to the Worker logs. |
| `KLIPY_API_KEY` secret (GIF search) | **Not set.** The GIF picker shows "GIFs aren't set up yet". |
| Production D1 database | Migrations 0001–0003 applied. The owner's account has the `admin` role. |
| R2 bucket `darkchat-media` | Created. No lifecycle rule yet (see Open items). |

## Features

- **Rooms and direct messages:** sent and received live over WebSockets. Each room and each DM pair is one Durable Object (`ChatRoom`).
- **24-hour expiry:** every message is deleted 24 hours after it's sent, along with any video file it carries. A Durable Object alarm runs the deletion, and open tabs drop expired messages live.
- **Compression:**
  - **Stored messages:** deflate-compressed, or kept as plain text when compressing would make them bigger.
  - **History on join:** sent as one deflate-compressed binary frame.
  - **Live messages:** compressed with WebSocket `permessage-deflate`.
- **GIFs:** come from KLIPY through `/api/gifs`, so the key never reaches the browser. Klipy only sees an anonymous per-user hash. Messages may only contain GIF links on `klipy.com` hosts.
- **Videos:**
  - **Compression:** the browser re-encodes each video to the smallest size it can, aiming for about 2.5 MB with a hard 3 MB cap. Clips can be up to 3 minutes long.
  - **Storage:** files go in R2. The Worker rejects any upload over 3 MB.
- **Badges:** set from the admin panel or worked out automatically.
  - **Verified:** a check mark that admins grant.
  - **Roles:** `admin` and `mod`.
  - **`early`:** automatic for the first 100 accounts, by insert order (`rowid`).
- **Admin panel:** admins only (the shield button next to your name). From it you can search members, toggle Verified and set roles. The server enforces this: `/api/admin/*` returns 403 for non-admins, and nobody can remove their own admin role.
- **Custom 404 page:** shown to browsers for any page that doesn't exist. The owner wrote its wording, and it's kept exactly as written, spelling included. Don't "fix" it without asking.
- **Accounts:** email and password through OpenAuth. Sessions are HttpOnly cookies (`kc_at` for 1 day, `kc_rt` for 30 days), and the access token is refreshed automatically.

## Code map

| File | What it does |
| --- | --- |
| `src/index.ts` | Worker entry point: login (OpenAuth issuer plus an in-process client), session cookies, the JSON API, admin endpoints, video upload and serving, Klipy proxy, Resend email, WebSocket routing |
| `src/chat-room.ts` | `ChatRoom` Durable Object: message storage (SQLite), broadcasting, history, the 24-hour alarm, R2 cleanup |
| `src/compress.ts` | Deflate helpers |
| `src/ui.ts` | The whole chat page (HTML, CSS and JS in one string): chat, GIF picker, video compressor, admin panel |
| `src/notfound.ts` | Custom 404 page |
| `src/secrets.d.ts` | Types for the secrets (`wrangler types` can't see them) |
| `migrations/` | D1 schema: `user`, `room`, then the badge columns |

**API routes:** `/api/me`, `/api/users`, `/api/rooms` (GET, POST), `/api/gifs`, `/api/media` (POST), `/media/<key>`, `/api/admin/users` (GET), `/api/admin/users/<id>` (POST), `/ws/room/<name>`, `/ws/dm/<userId>`, `/login`, `/logout`, `/callback`. Everything else goes to the OpenAuth issuer.

## Setup and deploy

```bash
npm install
```
```bash
npx wrangler d1 migrations apply AUTH_DB --local
```
```bash
npm run dev
```

For local development, copy `.dev.vars.example` to `.dev.vars` and fill it in. Without `RESEND_API_KEY`, sign-up codes are printed in the dev server output.

Production secrets:
```bash
npx wrangler secret put RESEND_API_KEY
```
```bash
npx wrangler secret put KLIPY_API_KEY
```

`EMAIL_FROM` in `wrangler.json` is `onboarding@resend.dev`. That sender only delivers to the Resend account's own address. To email every user, verify a domain in Resend and change `EMAIL_FROM`.

To make someone an admin, run this on the D1 database:
```sql
UPDATE user SET role = 'admin' WHERE email = 'person@example.com';
```

## Gotchas

- **Workers Builds' default deploy command is `npx wrangler deploy`.** That doesn't run the `predeploy` npm script, so unless the build settings were changed, **D1 migrations are not applied automatically**. Apply each new migration to the remote database yourself, before merging code that needs it:
  ```bash
  npx wrangler d1 migrations apply AUTH_DB --remote
  ```
  Migrations 0002 and 0003 were applied by hand and recorded in `d1_migrations`, so running this won't repeat them.
- **Durable Object class changes fail on pull-request builds.** Preview builds use `wrangler versions upload`, which can't add, rename or delete a Durable Object class. This is why #1's preview build failed; the production build (`wrangler deploy`) handled it fine.
- **Don't rename the Worker** in `wrangler.json`. See the top of this file.
- **`src/ui.ts` is one template literal.** Inside its `<script>`, don't use backticks, `${`, or backslashes: a `\/` turns into `/` and silently breaks regexes. Use string concatenation, and check the script still parses:
  ```bash
  node --experimental-strip-types -e 'import("./src/ui.ts").then(m=>new Function(m.APP_HTML.split("<script>")[1].split("</script>")[0]))'
  ```
- **Browser-recorded WebM videos report an infinite length** until you seek to the end. `compressVideo` already handles this.
- **The Klipy integration was written without the docs.** docs.klipy.com was blocked from the build environment, so the response parsing (`toGif` in `src/index.ts`) is deliberately tolerant. Check it with a real key.
- **Codex reviews every pull request automatically.** Its earlier findings were all real and fixed. Check its claims against the code; one had the right symptom but the wrong cause.

## Open items and ideas

1. Merge #2, or ask for changes first.
2. Set `RESEND_API_KEY` and `KLIPY_API_KEY`. Then sign up a test account and send a GIF to confirm both work.
3. Verify a sender domain in Resend.
4. Optional safety net for uploaded videos that were never sent:
   ```bash
   npx wrangler r2 bucket lifecycle add darkchat-media expire-1d --expire-days 1
   ```
5. Decide whether mods get powers, such as deleting messages or removing people. Right now `mod` is only a badge.
6. Decide whether the 3-minute video limit is right.
7. The owner has older chat Workers on the account (`keychat`, `chating`, `officla-chat`). Nobody has decided whether to keep them.
8. There are no automated tests. Everything above was checked by hand with `wrangler dev` and Playwright.
