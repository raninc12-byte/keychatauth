# DarkChat

Real-time chat on Cloudflare Workers, built on top of the [OpenAuth](https://openauth.js.org/) login server this repo started as.

## Features

- **Rooms and direct messages.** Anyone signed in can create or join a `#room`, or message another user privately. Messages arrive instantly over WebSockets; each room and DM is its own [Durable Object](https://developers.cloudflare.com/durable-objects/).
- **GIFs from [KLIPY](https://klipy.com).** A GIF button opens a trending/search picker. Searches go through the Worker (`/api/gifs`), so the API key never reaches the browser and users are identified to Klipy only by an anonymous hash. Only `klipy.com` GIF links are accepted in messages.
- **Videos compressed to the smallest size, 3 MB max.** The browser re-encodes the video before upload, aiming for about 2.5 MB. Lower budgets get a smaller picture (720p down to 240p), and audio is dropped for very long clips. If a pass comes out over 3 MB it tries again at a lower bitrate; if the original file is already smaller, the original is sent. Clips can be up to 3 minutes long. The Worker rejects anything over 3 MB and stores videos in R2.
- **Compressed messages.** Text is stored deflate-compressed, history is sent as one compressed binary frame, and live messages use WebSocket `permessage-deflate`.
- **Everything disappears after 24 hours.** Each message shows a countdown. A Durable Object alarm deletes expired messages *and their video files*, and open tabs remove them live.
- **Accounts.** Email and password sign-up, login and password reset through OpenAuth. Verification codes are emailed with [Resend](https://resend.com).

## Secrets and settings

| Name | Kind | What it's for |
| --- | --- | --- |
| `RESEND_API_KEY` | secret | Sends verification-code emails. Without it, codes are only written to the Worker logs. |
| `KLIPY_API_KEY` | secret | GIF search. Without it, the GIF picker shows "GIFs aren't set up yet". |
| `EMAIL_FROM` | var in `wrangler.json` | Sender address. `onboarding@resend.dev` only delivers to your own Resend account email. Verify a domain in Resend to email everyone. |

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put KLIPY_API_KEY
```

For local development, copy `.dev.vars.example` to `.dev.vars` and fill it in.

As a safety net for uploads that were never sent, add a 1-day lifecycle rule to the video bucket:

```bash
npx wrangler r2 bucket lifecycle add darkchat-media expire-1d --expire-days 1
```

## Getting Started

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/openauth-template
```

A live public deployment of this template is available at [https://openauth-template.templates.workers.dev](https://openauth-template.templates.workers.dev)

## Setup Steps

Create the R2 bucket for videos with `npx wrangler r2 bucket create darkchat-media`, then follow the steps below.

1. Install the project dependencies with a package manager of your choice:
   ```bash
   npm install
   ```
2. Create a [D1 database](https://developers.cloudflare.com/d1/get-started/) with the name "openauth-template-auth-db":
   ```bash
   npx wrangler d1 create openauth-template-auth-db
   ```
   ...and update the `database_id` field in `wrangler.json` with the new database ID.
3. Run the following db migration to initialize the database (notice the `migrations` directory in this project):
   ```bash
   npx wrangler d1 migrations apply --remote openauth-template-auth-db
   ```
4. Create a [kv namespace](https://developers.cloudflare.com/kv/get-started/) with a binding named "AUTH_STORAGE":
   ```bash
   npx wrangler kv namespace create AUTH_STORAGE
   ```
   ...and update the `kv_namespaces` -> `id` field in `wrangler.json` with the new namespace ID.
5. Deploy the project! (The new `room` table migration and the `ChatRoom` Durable Object are applied automatically: `predeploy` runs the D1 migrations.)
   ```bash
   npx wrangler deploy
   ```
6. And monitor your worker
   ```bash
   npx wrangler tail
   ```
