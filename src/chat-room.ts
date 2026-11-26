import { DurableObject } from "cloudflare:workers";
import { packJSON, packText, unpackText } from "./compress";

/** Every message is deleted this long after it was sent. */
export const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_TEXT = 4000;
const HISTORY_LIMIT = 500;

type Attachment = { userId: string; name: string };
type Row = { id: string; user_id: string; user_name: string; body: ArrayBuffer; media: string | null; created_at: number };

/** A GIF from Klipy, or a compressed video stored in R2. */
export type Media =
	| { kind: "gif"; url: string; w: number; h: number }
	| { kind: "video"; key: string; w: number; h: number; size: number };

export type ChatMessage = { id: string; userId: string; name: string; text: string; media: Media | null; at: number; expiresAt: number };

function cleanMedia(input: unknown): Media | null {
	if (!input || typeof input !== "object") return null;
	const m = input as Record<string, unknown>;
	const w = Math.max(1, Math.min(4096, Number(m.w) || 1));
	const h = Math.max(1, Math.min(4096, Number(m.h) || 1));
	if (m.kind === "gif" && typeof m.url === "string") {
		try {
			const u = new URL(m.url);
			if (u.protocol === "https:" && (u.hostname === "klipy.com" || u.hostname.endsWith(".klipy.com"))) {
				return { kind: "gif", url: u.toString(), w, h };
			}
		} catch {
			// not a URL
		}
	}
	if (m.kind === "video" && typeof m.key === "string" && /^media\/[0-9a-f-]{36}$/.test(m.key)) {
		return { kind: "video", key: m.key, w, h, size: Number(m.size) || 0 };
	}
	return null;
}

/**
 * One Durable Object per room or DM. Messages live in the object's SQLite
 * storage, deflate-compressed, and an alarm deletes them after 24 hours.
 */
export class ChatRoom extends DurableObject<Env> {
	private sql: SqlStorage;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql = ctx.storage.sql;
		this.ensureSchema();
	}

	private ensureSchema() {
		this.sql.exec(`CREATE TABLE IF NOT EXISTS message (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			user_name TEXT NOT NULL,
			body BLOB NOT NULL,
			created_at INTEGER NOT NULL
		)`);
		try {
			this.sql.exec(`ALTER TABLE message ADD COLUMN media TEXT`);
		} catch {
			// column already exists
		}
		this.sql.exec(`CREATE INDEX IF NOT EXISTS message_created ON message (created_at)`);
	}

	async fetch(request: Request): Promise<Response> {
		if (request.headers.get("Upgrade") !== "websocket") {
			return new Response("Expected WebSocket", { status: 426 });
		}
		const userId = request.headers.get("x-chat-user-id");
		const name = request.headers.get("x-chat-user-name");
		if (!userId || !name) return new Response("Unauthorized", { status: 401 });

		const { 0: client, 1: server } = new WebSocketPair();
		this.ctx.acceptWebSocket(server);
		server.serializeAttachment({ userId, name } satisfies Attachment);

		await this.purgeExpired();
		server.send(await packJSON({ type: "history", messages: await this.history() }));
		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer) {
		if (typeof data !== "string") return;
		let parsed: { type?: string; text?: unknown; media?: unknown };
		try {
			parsed = JSON.parse(data);
		} catch {
			return;
		}
		if (parsed.type !== "msg") return;
		const text = typeof parsed.text === "string" ? parsed.text.trim().slice(0, MAX_TEXT) : "";
		const media = cleanMedia(parsed.media);
		if (!text && !media) return;

		const { userId, name } = ws.deserializeAttachment() as Attachment;
		const at = Date.now();
		const id = crypto.randomUUID();
		this.sql.exec(
			`INSERT INTO message (id, user_id, user_name, body, media, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
			id,
			userId,
			name,
			await packText(text),
			media ? JSON.stringify(media) : null,
			at,
		);
		await this.scheduleCleanup();

		const msg: ChatMessage = { id, userId, name, text, media, at, expiresAt: at + MESSAGE_TTL_MS };
		const frame = JSON.stringify({ type: "msg", message: msg });
		for (const peer of this.ctx.getWebSockets()) {
			try {
				peer.send(frame);
			} catch {
				// peer already gone
			}
		}
	}

	async webSocketClose(ws: WebSocket, code: number) {
		try {
			ws.close(code, "bye");
		} catch {
			// already closed
		}
	}

	/** Runs when the oldest message reaches 24 hours old. */
	async alarm() {
		await this.purgeExpired();
		await this.scheduleCleanup();
		const ids = [...this.sql.exec<{ id: string }>(`SELECT id FROM message`)].length;
		if (ids === 0 && this.ctx.getWebSockets().length === 0) {
			await this.ctx.storage.deleteAll();
			// This object may stay warm, so put the empty table back right away.
			this.ensureSchema();
		}
	}

	private async purgeExpired() {
		const cutoff = Date.now() - MESSAGE_TTL_MS;
		const rows = [...this.sql.exec<{ id: string; media: string | null }>(`SELECT id, media FROM message WHERE created_at <= ?`, cutoff)];
		if (rows.length === 0) return;
		const expired = rows.map((r) => r.id);
		// Delete uploaded videos along with their messages.
		const keys = rows.flatMap((r) => {
			const m = r.media ? (JSON.parse(r.media) as Media) : null;
			return m?.kind === "video" ? [m.key] : [];
		});
		if (keys.length) await this.env.MEDIA.delete(keys);
		this.sql.exec(`DELETE FROM message WHERE created_at <= ?`, cutoff);
		const frame = JSON.stringify({ type: "expired", ids: expired });
		for (const peer of this.ctx.getWebSockets()) {
			try {
				peer.send(frame);
			} catch {
				// ignore
			}
		}
	}

	private async scheduleCleanup() {
		const oldest = [...this.sql.exec<{ t: number | null }>(`SELECT MIN(created_at) AS t FROM message`)][0]?.t;
		if (oldest == null) {
			await this.ctx.storage.deleteAlarm();
			return;
		}
		const due = oldest + MESSAGE_TTL_MS;
		const current = await this.ctx.storage.getAlarm();
		if (current == null || current > due) await this.ctx.storage.setAlarm(due);
	}

	private async history(): Promise<ChatMessage[]> {
		const rows = [
			...this.sql.exec<Row>(
				`SELECT * FROM (SELECT * FROM message ORDER BY created_at DESC LIMIT ?) ORDER BY created_at ASC`,
				HISTORY_LIMIT,
			),
		];
		return Promise.all(
			rows.map(async (r) => ({
				id: r.id,
				userId: r.user_id,
				name: r.user_name,
				text: await unpackText(r.body),
				media: r.media ? (JSON.parse(r.media) as Media) : null,
				at: r.created_at,
				expiresAt: r.created_at + MESSAGE_TTL_MS,
			})),
		);
	}
}
