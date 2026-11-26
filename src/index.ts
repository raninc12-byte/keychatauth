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

const CLIENT_ID = "darkchat";
/** Largest video we accept after the browser has compressed it. */
const MAX_VIDEO_BYTES = 3 * 1024 * 1024;
const ROOM_NAME = /^[a-z0-9][a-z0-9-]{0,31}$/;

type User = { id: string; email: string; verified: number; role: Role };
type Role = "user" | "mod" | "admin";

/** The first this-many accounts get the "Early member" badge. */
const EARLY_MEMBERS = 100;

/** Every user with their badges. "early" comes from sign-up order, not a stored flag. */
const USERS_WITH_BADGES = `
	SELECT id, email, verified, role, created_at,
		ROW_NUMBER() OVER (ORDER BY created_at, id) <= ${EARLY_MEMBERS} AS early
	FROM user`;
type UserRow = User & { created_at: string; early: number };

function publicUser(u: UserRow) {
	return { id: u.id, name: displayName(u.email), verified: !!u.verified, role: u.role, early: !!u.early };
}

function authServer(env: Env) {
	return issuer({
		storage: CloudflareStorage({ namespace: env.AUTH_STORAGE }),
		subjects,
		providers: {
			password: PasswordProvider(
				PasswordUI({
					sendCode: (email, code) => sendCodeEmail(env, email, code),
				}),
			),
		},
		theme: {
			title: "DarkChat",
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

		const isApp =
			url.pathname === "/" || url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws/") || url.pathname.startsWith("/media/");
		if (!isApp) return auth.fetch(request, env, ctx);

		// Everything below needs a signed-in user.
		const session = await getSession(request, client);
		if (!session) {
			return url.pathname === "/" ? Response.redirect(url.origin + "/login", 302) : new Response("Unauthorized", { status: 401 });
		}
		const me = await env.AUTH_DB.prepare(`SELECT id, email, verified, role FROM user WHERE id = ?`).bind(session.userId).first<User>();
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
	if (url.pathname === "/api/me") {
		const row = await env.AUTH_DB.prepare(`SELECT * FROM (${USERS_WITH_BADGES}) WHERE id = ?`).bind(me.id).first<UserRow>();
		return Response.json(publicUser(row ?? { ...me, created_at: "", early: 0 }));
	}

	// Everyone, including you, so the page can show badges on any message.
	if (url.pathname === "/api/users") {
		const { results } = await env.AUTH_DB.prepare(`${USERS_WITH_BADGES} ORDER BY email`).all<UserRow>();
		return Response.json(results.map(publicUser));
	}

	if (url.pathname.startsWith("/api/admin/")) {
		if (me.role !== "admin") return Response.json({ error: "Admins only." }, { status: 403 });
		if (url.pathname === "/api/admin/users" && request.method === "GET") {
			const { results } = await env.AUTH_DB.prepare(`${USERS_WITH_BADGES} ORDER BY created_at`).all<UserRow>();
			return Response.json(results.map((u) => ({ ...publicUser(u), email: u.email, joined: u.created_at })));
		}
		const target = url.pathname.match(/^\/api\/admin\/users\/([0-9a-f]{32})$/);
		if (target && request.method === "POST") {
			if (!sameOrigin(request, url)) return new Response("Forbidden", { status: 403 });
			const body = await request.json<{ verified?: unknown; role?: unknown }>().catch(() => ({}) as Record<string, unknown>);
			const id = target[1];
			if (body.role !== undefined) {
				if (body.role !== "user" && body.role !== "mod" && body.role !== "admin") {
					return Response.json({ error: "Role must be user, mod or admin." }, { status: 400 });
				}
				// Stop the last admin from locking everyone out.
				if (id === me.id && body.role !== "admin") return Response.json({ error: "You can't remove your own admin role." }, { status: 400 });
				await env.AUTH_DB.prepare(`UPDATE user SET role = ? WHERE id = ?`).bind(body.role, id).run();
			}
			if (body.verified !== undefined) {
				await env.AUTH_DB.prepare(`UPDATE user SET verified = ? WHERE id = ?`).bind(body.verified ? 1 : 0, id).run();
			}
			const row = await env.AUTH_DB.prepare(`SELECT * FROM (${USERS_WITH_BADGES}) WHERE id = ?`).bind(id).first<UserRow>();
			if (!row) return Response.json({ error: "No such user." }, { status: 404 });
			return Response.json({ ...publicUser(row), email: row.email, joined: row.created_at });
		}
		return new Response("Not found", { status: 404 });
	}

	if (url.pathname === "/api/gifs") return searchGifs(url, env, me);

	if (url.pathname === "/api/media" && request.method === "POST") {
		if (!sameOrigin(request, url)) return new Response("Forbidden", { status: 403 });
		const type = request.headers.get("Content-Type") ?? "";
		if (!/^video\/(webm|mp4)\b/.test(type)) return Response.json({ error: "Only WebM or MP4 video." }, { status: 415 });
		const declared = Number(request.headers.get("Content-Length") ?? "0");
		if (declared > MAX_VIDEO_BYTES) return Response.json({ error: "Video is over 3 MB after compression." }, { status: 413 });
		const body = await request.arrayBuffer();
		if (body.byteLength === 0 || body.byteLength > MAX_VIDEO_BYTES) {
			return Response.json({ error: "Video is over 3 MB after compression." }, { status: 413 });
		}
		const key = `media/${crypto.randomUUID()}`;
		await env.MEDIA.put(key, body, { httpMetadata: { contentType: type.split(";")[0] }, customMetadata: { uploader: me.id } });
		return Response.json({ key, size: body.byteLength });
	}

	if (url.pathname.startsWith("/media/")) {
		const key = url.pathname.slice(1);
		if (!/^media\/[0-9a-f-]{36}$/.test(key)) return new Response("Not found", { status: 404 });
		const obj = await env.MEDIA.get(key, { range: request.headers });
		if (!obj) return new Response("Gone (media is deleted after 24 hours)", { status: 404 });
		const headers = new Headers({ "Cache-Control": "private, max-age=3600", "Accept-Ranges": "bytes" });
		obj.writeHttpMetadata(headers);
		if (request.headers.has("Range") && obj.range && "offset" in obj.range) {
			const start = obj.range.offset ?? 0;
			const end = start + (obj.range.length ?? obj.size - start) - 1;
			headers.set("Content-Range", `bytes ${start}-${end}/${obj.size}`);
			headers.set("Content-Length", String(end - start + 1));
			return new Response(obj.body, { status: 206, headers });
		}
		headers.set("Content-Length", String(obj.size));
		return new Response(obj.body, { headers });
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
		// Pass the browser's permessage-deflate offer through so live messages are compressed.
		const extensions = request.headers.get("Sec-WebSocket-Extensions");
		if (extensions) headers.set("Sec-WebSocket-Extensions", extensions);
		const stub = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(key));
		return stub.fetch(new Request(url.toString(), { headers }));
	}

	return new Response("Not found", { status: 404 });
}

async function getSession(request: Request, client: ReturnType<typeof createClient>) {
	const cookies = parseCookies(request.headers.get("Cookie"));
	let access = cookies.kc_at;
	let refresh = cookies.kc_rt;
	let renewed = false;
	if (!access) {
		// The access cookie expires after a day; use the refresh token to sign back in.
		if (!refresh) return null;
		const r = await client.refresh(refresh);
		if (r.err || !r.tokens) return null;
		access = r.tokens.access;
		refresh = r.tokens.refresh;
		renewed = true;
	}
	const verified = await client.verify(subjects, access, { refresh });
	if (verified.err || verified.subject.type !== "user") return null;
	return {
		userId: verified.subject.properties.id,
		refreshed: verified.tokens
			? tokenCookies(verified.tokens.access, verified.tokens.refresh)
			: renewed
				? tokenCookies(access, refresh)
				: null,
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

/** Emails the sign-in code with Resend, or logs it when no key is configured. */
async function sendCodeEmail(env: Env, email: string, code: string): Promise<void> {
	if (!env.RESEND_API_KEY) {
		console.log(`RESEND_API_KEY not set; code for ${email} is ${code}`);
		return;
	}
	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
		body: JSON.stringify({
			from: env.EMAIL_FROM || "DarkChat <onboarding@resend.dev>",
			to: [email],
			subject: `Your DarkChat code: ${code}`,
			text: `Your DarkChat verification code is ${code}.\n\nIf you didn't ask for this, you can ignore this email.`,
			html: `<p>Your DarkChat verification code is</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p style="color:#666">If you didn't ask for this, you can ignore this email.</p>`,
		}),
	});
	if (!res.ok) {
		console.error(`Resend failed (${res.status}): ${await res.text()}`);
		throw new Error("Could not send the verification email.");
	}
}

type Gif = { id: string; title: string; url: string; preview: string; w: number; h: number };

/** Proxies Klipy GIF search/trending so the API key stays on the server. */
async function searchGifs(url: URL, env: Env, me: User): Promise<Response> {
	if (!env.KLIPY_API_KEY) return Response.json({ error: "GIFs aren't set up yet (KLIPY_API_KEY missing)." }, { status: 503 });
	const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
	const page = Math.max(1, Math.min(50, Number(url.searchParams.get("page")) || 1));
	// Klipy wants a stable, anonymous per-user id; never send the email.
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("darkchat:" + me.id));
	const customerId = [...new Uint8Array(digest).slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
	const api = new URL(`https://api.klipy.com/api/v1/${encodeURIComponent(env.KLIPY_API_KEY)}/gifs/${q ? "search" : "trending"}`);
	if (q) api.searchParams.set("q", q);
	api.searchParams.set("page", String(page));
	api.searchParams.set("per_page", "24");
	api.searchParams.set("customer_id", customerId);
	api.searchParams.set("locale", "en");
	const res = await fetch(api, { cf: { cacheTtl: 300, cacheEverything: true } });
	if (!res.ok) return Response.json({ error: `Klipy returned ${res.status}.` }, { status: 502 });
	const json = await res.json<{ data?: { data?: unknown[]; has_next?: boolean } }>();
	const items = (json.data?.data ?? []).map(toGif).filter((g): g is Gif => g !== null);
	return Response.json({ gifs: items, hasNext: Boolean(json.data?.has_next) });
}

type KlipyFile = { url?: string; width?: number; height?: number };
type KlipySizes = Record<string, Record<string, KlipyFile | undefined> | undefined>;

function toGif(raw: unknown): Gif | null {
	const item = raw as { id?: string | number; slug?: string; title?: string; type?: string; file?: KlipySizes };
	if (!item?.file || item.type === "ad") return null;
	const pick = (sizes: string[], formats: string[]) => {
		for (const s of sizes) for (const f of formats) {
			const file = item.file?.[s]?.[f];
			if (file?.url) return file;
		}
		return null;
	};
	// Send the medium GIF in chat and use the smallest file for the picker grid.
	const full = pick(["md", "sm", "hd", "xs"], ["gif", "webp"]);
	const small = pick(["xs", "sm", "md"], ["webp", "gif"]) ?? full;
	if (!full || !small) return null;
	return {
		id: String(item.id ?? item.slug ?? full.url),
		title: item.title ?? "",
		url: full.url!,
		preview: small.url!,
		w: full.width ?? 200,
		h: full.height ?? 200,
	};
}
