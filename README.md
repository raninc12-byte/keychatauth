# KeyChat

Real-time chat on Cloudflare Workers, built on top of the [OpenAuth](https://openauth.js.org/) login server this repo started as.

## Features

- **Rooms and direct messages.** Anyone signed in can create or join a `#room`, or message another user privately. Messages arrive instantly over WebSockets; each room and DM is its own [Durable Object](https://developers.cloudflare.com/durable-objects/).
- **Compression.** Each message is stored deflate-compressed in the Durable Object's SQLite storage, falling back to plain text when compressing would make a tiny message bigger. Chat history is sent to the browser as one deflate-compressed binary frame, and the browser unpacks it with `DecompressionStream`. Live messages use the WebSocket's built-in `permessage-deflate` compression.
- **Messages delete themselves after 24 hours.** Each message shows a countdown. A Durable Object alarm deletes expired messages on the server and tells open tabs to remove them. Nothing is kept after that.
- **Accounts.** Email and password sign-up, login and password reset through OpenAuth (D1 + KV), with a signed-in session kept in HttpOnly cookies.

| Path | What it is |
| --- | --- |
| `/` | The chat app (redirects to `/login` when signed out) |
| `/login`, `/logout` | Start sign-in / sign out |
| `/api/me`, `/api/users`, `/api/rooms` | JSON API used by the app |
| `/ws/room/:name`, `/ws/dm/:userId` | WebSocket chat connections |

Verification codes are printed to the Worker logs (`npx wrangler tail`). Connect a real email sender in `src/index.ts` (`sendCode`) before inviting people.

## Getting Started

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/openauth-template
```

A live public deployment of this template is available at [https://openauth-template.templates.workers.dev](https://openauth-template.templates.workers.dev)

## Setup Steps

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
