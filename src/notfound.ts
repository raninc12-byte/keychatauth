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
:root{color-scheme:dark;--text:#e8e6e3;--muted:#a19d97;--dim:#6f6b66;--line:rgba(255,255,255,.08);--ok:#7fb48a;--bad:#d98282;--accent:#c9a46b;--accent-ink:#1a1408}
*{box-sizing:border-box}
body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:16px;background:#0d0d0f;color:var(--text);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:0;z-index:-1;background:radial-gradient(120% 80% at 30% 0%,#1a1a1d 0%,#0d0d0f 60%)}
.card{width:min(720px,100%);padding:32px clamp(18px,5vw,40px);border-radius:10px;background:rgba(255,255,255,.035);border:1px solid var(--line);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.code{font-size:13px;font-weight:600;color:var(--bad)}
h1{margin:12px 0 26px;font-size:clamp(28px,6vw,40px);letter-spacing:-.02em;line-height:1.1}
.path{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;align-items:start;gap:6px;margin-bottom:28px}
.link{height:1px;margin-top:28px;width:clamp(16px,6vw,60px);background:var(--line)}
.node{text-align:center;padding:4px;border-radius:16px}
.node.src .ic{border-color:var(--bad)}
.ic{position:relative;width:56px;height:56px;margin:0 auto 8px;border-radius:10px;display:grid;place-items:center;background:rgba(255,255,255,.04);border:1px solid var(--line)}
.ic svg{width:26px;height:26px;fill:none;stroke:var(--muted);stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.dot{position:absolute;right:-6px;bottom:-6px;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;color:#0d0d0f;border:2px solid #0d0d0f}
.ic.ok .dot{background:var(--ok)}
.ic.bad .dot{background:var(--bad)}
.loc{font-size:12px;color:var(--dim)}
.nm{font-weight:650}
.st{font-size:13px;font-weight:600}
.st.ok{color:var(--ok)}
.st.bad{color:var(--bad)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.box{padding:16px 18px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
.box h2{margin:0 0 6px;font-size:14px;color:var(--muted);font-weight:650}
.box p{margin:0}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
.btn{display:inline-flex;align-items:center;height:38px;padding:0 16px;border-radius:8px;text-decoration:none;color:var(--accent-ink);font-weight:600;background:var(--accent)}
.btn{border:0;font:inherit;cursor:pointer}
.btn.ghost{background:transparent;border:1px solid var(--line);color:var(--text)}
.more{margin:18px 0 0;color:var(--dim);font-size:13px}
.more b{color:var(--muted);font-weight:600}
a{color:var(--accent)}
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
