// The custom "page not found" page. The wording below is the site owner's own and is kept exactly as written.
const PAGE = {
	title: "EER NO PAGE",
	error_code: "404",
	more_information: { hidden: false, text: "cloudflare.com", link: "", for: "more information" },
	browser_status: { status: "ok", location: "You", name: "Browser", status_text: "" },
	cloudflare_status: { status: "ok", location: "", name: "Cloudflare", status_text: "" },
	host_status: { status: "error", location: "Website", name: "Host", status_text: "" },
	error_source: "host",
	what_happened: "Yo dont have accses to the page you are trying to visit or it dosent exitst",
	what_can_i_do: "Get premitions or find a page that works",
};

type Status = { status: string; location: string; name: string; status_text: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function node(s: Status, key: string): string {
	const ok = s.status === "ok";
	const label = s.status_text || (ok ? "Working" : "Error");
	const icon =
		key === "browser"
			? '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>'
			: key === "cloudflare"
				? '<path d="M7 18a4 4 0 010-8 5.5 5.5 0 0110.6-1.5A4 4 0 0117 18z"/>'
				: '<rect x="4" y="3" width="16" height="7" rx="2"/><rect x="4" y="14" width="16" height="7" rx="2"/><path d="M8 6.5h.01M8 17.5h.01"/>';
	return `<div class="node${PAGE.error_source === key ? " src" : ""}">
	<div class="ic ${ok ? "ok" : "bad"}"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg><span class="dot" aria-hidden="true">${ok ? "✓" : "✕"}</span></div>
	${s.location ? `<div class="loc">${esc(s.location)}</div>` : ""}
	<div class="nm">${esc(s.name)}</div>
	<div class="st ${ok ? "ok" : "bad"}">${esc(label)}</div>
</div>`;
}

function moreInfo(): string {
	const m = PAGE.more_information;
	if (m.hidden) return "";
	const text = m.link ? `<a href="${esc(m.link)}">${esc(m.text)}</a>` : `<b>${esc(m.text)}</b>`;
	return `<p class="more">${text} ${esc(m.for)}</p>`;
}

const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#06060b">
<title>${esc(PAGE.error_code)} · ${esc(PAGE.title)}</title>
<style>
:root{color-scheme:dark;--text:#f2f2f7;--muted:#9b9bb0;--dim:#6b6b80;--line:rgba(255,255,255,.08);--ok:#34d399;--bad:#fb7185;--accent:#8b7bff;--accent-2:#5ec8ff}
*{box-sizing:border-box}
body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:16px;background:#06060b;color:var(--text);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:-20%;z-index:-1;background:radial-gradient(40% 35% at 20% 20%,rgba(139,123,255,.32),transparent 70%),radial-gradient(35% 30% at 85% 20%,rgba(94,200,255,.2),transparent 70%),radial-gradient(45% 40% at 60% 95%,rgba(251,113,133,.16),transparent 70%);filter:blur(30px)}
.card{width:min(720px,100%);padding:32px clamp(18px,5vw,40px);border-radius:24px;background:rgba(255,255,255,.045);border:1px solid var(--line);backdrop-filter:saturate(170%) blur(26px);-webkit-backdrop-filter:saturate(170%) blur(26px);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 30px 70px -30px rgba(0,0,0,.7)}
.code{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.1em;color:var(--bad);border:1px solid rgba(251,113,133,.4);background:rgba(251,113,133,.12);padding:2px 10px;border-radius:999px}
h1{margin:12px 0 26px;font-size:clamp(28px,6vw,40px);letter-spacing:-.02em;line-height:1.1}
.path{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;align-items:start;gap:6px;margin-bottom:28px}
.link{height:2px;margin-top:27px;width:clamp(16px,6vw,60px);background:linear-gradient(90deg,var(--line),rgba(255,255,255,.25),var(--line));border-radius:2px}
.node{text-align:center;padding:4px;border-radius:16px}
.node.src .ic{box-shadow:0 0 0 4px rgba(251,113,133,.15),0 0 24px rgba(251,113,133,.35)}
.ic{position:relative;width:56px;height:56px;margin:0 auto 8px;border-radius:18px;display:grid;place-items:center;background:rgba(255,255,255,.06);border:1px solid var(--line)}
.ic svg{width:26px;height:26px;fill:none;stroke:var(--muted);stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.dot{position:absolute;right:-6px;bottom:-6px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:800;color:#06060b;border:2px solid #0c0c14}
.ic.ok .dot{background:var(--ok)}
.ic.bad .dot{background:var(--bad)}
.loc{font-size:12px;color:var(--dim)}
.nm{font-weight:650}
.st{font-size:13px;font-weight:600}
.st.ok{color:var(--ok)}
.st.bad{color:var(--bad)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.box{padding:16px 18px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid var(--line)}
.box h2{margin:0 0 6px;font-size:14px;color:var(--muted);font-weight:650}
.box p{margin:0}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
.btn{display:inline-flex;align-items:center;height:40px;padding:0 18px;border-radius:999px;text-decoration:none;color:#fff;font-weight:600;background:linear-gradient(135deg,var(--accent),var(--accent-2))}
.btn{border:0;font:inherit;cursor:pointer}
.btn.ghost{background:rgba(255,255,255,.06);border:1px solid var(--line);color:var(--text)}
.more{margin:18px 0 0;color:var(--dim);font-size:13px}
.more b{color:var(--muted);font-weight:600}
a{color:var(--accent-2)}
@media (max-width:560px){.cols{grid-template-columns:1fr}.link{width:12px}}
</style>
</head>
<body>
<main class="card">
<span class="code">Error ${esc(PAGE.error_code)}</span>
<h1>${esc(PAGE.title)}</h1>
<div class="path" role="list" aria-label="Connection status">
${node(PAGE.browser_status, "browser")}
<div class="link" aria-hidden="true"></div>
${node(PAGE.cloudflare_status, "cloudflare")}
<div class="link" aria-hidden="true"></div>
${node(PAGE.host_status, "host")}
</div>
<div class="cols">
<section class="box"><h2>What happened?</h2><p>${esc(PAGE.what_happened)}</p></section>
<section class="box"><h2>What can I do?</h2><p>${esc(PAGE.what_can_i_do)}</p></section>
</div>
<div class="actions"><a class="btn" href="/">Go to DarkChat</a><button class="btn ghost" type="button" onclick="history.back()">Go back</button></div>
${moreInfo()}
</main>
</body>
</html>`;

/** True when the visitor is a browser asking for a page (not a fetch from the app). */
export function wantsPage(request: Request): boolean {
	return request.method === "GET" && (request.headers.get("Accept") ?? "").includes("text/html");
}

export function notFoundPage(): Response {
	return new Response(HTML, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
