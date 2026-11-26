import { issuer } from "@openauthjs/openauth";
import { createClient } from "@openauthjs/openauth/client";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { createSubjects } from "@openauthjs/openauth/subject";
import { object, string } from "valibot";
import { APP_HTML } from "./ui";

export { ChatRoom } from "./chat-room";

const subjects = createSubjects({
	user: object({
		id: string(),
	}),
});

const CLIENT_ID = "keychat";
const ROOM_NAME = /^[a-z0-9][a-z0-9-]{0,31}$/;

type User = { id: string; email: string };

function authServer(env: Env) {
	return issuer({
		storage: CloudflareStorage({ namespace: env.AUTH_STORAGE }),
		subjects,
		providers: {
			password: PasswordProvider(
				PasswordUI({
					// eslint-disable-next-line @typescript-eslint/require-await
					sendCode: async (email, code) => {
						// Replace with a real email sender (e.g. Resend) before going live.
						console.log(`Sending code ${code} to ${email}`);
					},
					copy: { input_code: "Code (check Worker logs)" },
				}),
			),
		},
		theme: {
			title: "KeyChat",
			primary: "#5b5bd6",
			favicon: "https://workers.cloudflare.com//favicon.ico",
		},
		success: async (ctx, value) => {
			return ctx.subject("user", { id: await getOrCreateUser(env, value.email) });
		},
	});
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const auth = authServer(env);
		// The chat app and the auth server share one Worker, so the OpenAuth
		// client talks to the issuer in-process instead of over the network.
		const client = createClient({
			clientID: CLIENT_ID,
			issuer: url.origin,
			fetch: async (input, init) => auth.fetch(new Request(input, init), env, ctx),
		});
		const redirectURI = url.origin + "/callback";

		switch (url.pathname) {
			case "/login": {
				const { url: to } = await client.authorize(redirectURI, "code");
				return Response.redirect(to, 302);
			}
			case "/callback": {
				const code = url.searchParams.get("code");
				if (!code) return new Response("Missing code", { status: 400 });
				const exchanged = await client.exchange(code, redirectURI);
				if (exchanged.err) return new Response(exchanged.err.message, { status: 400 });
				return redirect("/", tokenCookies(exchanged.tokens.access, exchanged.tokens.refresh));
			}
			case "/logout":
				return redirect("/login", [clearCookie("kc_at"), clearCookie("kc_rt")]);
		}

		const isApp = url.pathname === "/" || url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws/");
		if (!isApp) return auth.fetch(request, env, ctx);

		// Everything below needs a signed-in user.
		const session = await getSession(request, client);
		if (!session) {
			return url.pathname === "/" ? Response.redirect(url.origin + "/login", 302) : new Response("Unauthorized", { status: 401 });
		}
		const me = await env.AUTH_DB.prepare(`SELECT id, email FROM user WHERE id = ?`).bind(session.userId).first<User>();
		if (!me) return redirect("/login", [clearCookie("kc_at"), clearCookie("kc_rt")]);

		const response = await handleApp(request, url, env, me);
		if (session.refreshed) {
			const headers = new Headers(response.headers);
			for (const c of session.refreshed) headers.append("Set-Cookie", c);
			if (response.status === 101) return new Response(null, { status: 101, webSocket: response.webSocket, headers });
			return new Response(response.body, { status: response.status, headers });
		}
		return response;
	},
} satisfies ExportedHandler<Env>;

async function handleApp(request: Request, url: URL, env: Env, me: User): Promise<Response> {
	if (url.pathname === "/") {
		return new Response(APP_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
	}
	if (url.pathname === "/api/me") return Response.json({ id: me.id, name: displayName(me.email) });

	if (url.pathname === "/api/users") {
		const { results } = await env.AUTH_DB.prepare(`SELECT id, email FROM user WHERE id != ? ORDER BY email`).bind(me.id).all<User>();
		return Response.json(results.map((u) => ({ id: u.id, name: displayName(u.email) })));
	}

	if (url.pathname === "/api/rooms") {
		if (request.method === "POST") {
			if (!sameOrigin(request, url)) return new Response("Forbidden", { status: 403 });
			const body = await request.json<{ name?: string }>().catch(() => ({}) as { name?: string });
			const name = (body.name ?? "").trim().toLowerCase();
			if (!ROOM_NAME.test(name)) {
				return Response.json({ error: "Room names: 1–32 lowercase letters, digits or dashes." }, { status: 400 });
			}
			await env.AUTH_DB.prepare(`INSERT OR IGNORE INTO room (name, created_by) VALUES (?, ?)`).bind(name, me.id).run();
			return Response.json({ name });
		}
		const { results } = await env.AUTH_DB.prepare(`SELECT name FROM room ORDER BY name`).all<{ name: string }>();
		return Response.json(results.map((r) => r.name));
	}

	const ws = url.pathname.match(/^\/ws\/(room|dm)\/([^/]+)$/);
	if (ws) {
		if (request.headers.get("Upgrade") !== "websocket") return new Response("Expected WebSocket", { status: 426 });
		if (!sameOrigin(request, url)) return new Response("Forbidden", { status: 403 });
		const [, kind, target] = ws;
		let key: string;
		if (kind === "room") {
			const room = await env.AUTH_DB.prepare(`SELECT name FROM room WHERE name = ?`).bind(target).first();
			if (!room) return new Response("No such room", { status: 404 });
			key = `room:${target}`;
		} else {
			const other = await env.AUTH_DB.prepare(`SELECT id FROM user WHERE id = ?`).bind(target).first();
			if (!other || target === me.id) return new Response("No such user", { status: 404 });
			key = `dm:${[me.id, target].sort().join(":")}`;
		}
		// Build a fresh request so a client can never supply its own identity headers.
		const headers = new Headers({ Upgrade: "websocket", "x-chat-user-id": me.id, "x-chat-user-name": displayName(me.email) });
		const stub = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(key));
		return stub.fetch(new Request(url.toString(), { headers }));
	}

	return new Response("Not found", { status: 404 });
}

async function getSession(request: Request, client: ReturnType<typeof createClient>) {
	const cookies = parseCookies(request.headers.get("Cookie"));
	const access = cookies.kc_at;
	if (!access) return null;
	const verified = await client.verify(subjects, access, { refresh: cookies.kc_rt });
	if (verified.err || verified.subject.type !== "user") return null;
	return {
		userId: verified.subject.properties.id,
		refreshed: verified.tokens ? tokenCookies(verified.tokens.access, verified.tokens.refresh) : null,
	};
}

function sameOrigin(request: Request, url: URL): boolean {
	const origin = request.headers.get("Origin");
	return origin === null || origin === url.origin;
}

function displayName(email: string): string {
	return email.split("@")[0];
}

function parseCookies(header: string | null): Record<string, string> {
	const out: Record<string, string> = {};
	for (const part of (header ?? "").split(";")) {
		const i = part.indexOf("=");
		if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
	}
	return out;
}

function tokenCookies(access: string, refresh: string): string[] {
	const base = "Path=/; HttpOnly; Secure; SameSite=Lax";
	return [`kc_at=${encodeURIComponent(access)}; ${base}; Max-Age=86400`, `kc_rt=${encodeURIComponent(refresh)}; ${base}; Max-Age=2592000`];
}

function clearCookie(name: string): string {
	return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function redirect(location: string, cookies: string[]): Response {
	const headers = new Headers({ Location: location });
	for (const c of cookies) headers.append("Set-Cookie", c);
	return new Response(null, { status: 302, headers });
}

async function getOrCreateUser(env: Env, email: string): Promise<string> {
	const result = await env.AUTH_DB.prepare(
		`
		INSERT INTO user (email)
		VALUES (?)
		ON CONFLICT (email) DO UPDATE SET email = email
		RETURNING id;
		`,
	)
		.bind(email)
		.first<{ id: string }>();
	if (!result) {
		throw new Error(`Unable to process user: ${email}`);
	}
	return result.id;
}
