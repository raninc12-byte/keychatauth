import { DurableObject } from "cloudflare:workers";
import { packJSON, packText, unpackText } from "./compress";

/** Every message is deleted this long after it was sent. */
export const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_TEXT = 4000;
const HISTORY_LIMIT = 500;

type Attachment = { userId: string; name: string };
type Row = { id: string; user_id: string; user_name: string; body: ArrayBuffer; created_at: number };

export type ChatMessage = { id: string; userId: string; name: string; text: string; at: number; expiresAt: number };

/**
 * One Durable Object per room or DM. Messages live in the object's SQLite
 * storage, deflate-compressed, and an alarm deletes them after 24 hours.
 */
export class ChatRoom extends DurableObject<Env> {
	private sql: SqlStorage;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql = ctx.storage.sql;
		this.sql.exec(`CREATE TABLE IF NOT EXISTS message (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			user_name TEXT NOT NULL,
			body BLOB NOT NULL,
			created_at INTEGER NOT NULL
		)`);
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

		this.purgeExpired();
		server.send(await packJSON({ type: "history", messages: await this.history() }));
		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer) {
		if (typeof data !== "string") return;
		let parsed: { type?: string; text?: unknown };
		try {
			parsed = JSON.parse(data);
		} catch {
			return;
		}
		if (parsed.type !== "msg" || typeof parsed.text !== "string") return;
		const text = parsed.text.trim().slice(0, MAX_TEXT);
		if (!text) return;

		const { userId, name } = ws.deserializeAttachment() as Attachment;
		const at = Date.now();
		const id = crypto.randomUUID();
		this.sql.exec(
			`INSERT INTO message (id, user_id, user_name, body, created_at) VALUES (?, ?, ?, ?, ?)`,
			id,
			userId,
			name,
			await packText(text),
			at,
		);
		await this.scheduleCleanup();

		const msg: ChatMessage = { id, userId, name, text, at, expiresAt: at + MESSAGE_TTL_MS };
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
		this.purgeExpired();
		await this.scheduleCleanup();
		const ids = [...this.sql.exec<{ id: string }>(`SELECT id FROM message`)].length;
		if (ids === 0 && this.ctx.getWebSockets().length === 0) {
			await this.ctx.storage.deleteAll();
		}
	}

	private purgeExpired() {
		const cutoff = Date.now() - MESSAGE_TTL_MS;
		const expired = [...this.sql.exec<{ id: string }>(`SELECT id FROM message WHERE created_at <= ?`, cutoff)].map((r) => r.id);
		if (expired.length === 0) return;
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
				at: r.created_at,
				expiresAt: r.created_at + MESSAGE_TTL_MS,
			})),
		);
	}
}
