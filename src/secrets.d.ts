// Secrets set with `wrangler secret put` (not in wrangler.json, so `wrangler types` can't see them).
declare namespace Cloudflare {
	interface Env {
		RESEND_API_KEY?: string;
		KLIPY_API_KEY?: string;
	}
}
