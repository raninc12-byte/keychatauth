// The chat front end: a single page served by the Worker.
export const APP_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>KeyChat</title>
<style>
:root{--bg:#f7f7fb;--panel:#fff;--line:#e4e4ee;--text:#1b1b2a;--muted:#6b6b80;--accent:#5b5bd6;--mine:#ececfd;--warn:#c2410c}
@media (prefers-color-scheme:dark){:root{--bg:#121219;--panel:#1b1b25;--line:#2c2c3a;--text:#ececf3;--muted:#9a9ab0;--accent:#8b8bf0;--mine:#2a2a48;--warn:#fb923c}}
*{box-sizing:border-box}
body{margin:0;font:15px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;background:var(--bg);color:var(--text);height:100dvh;display:flex}
aside{width:260px;background:var(--panel);border-right:1px solid var(--line);display:flex;flex-direction:column;overflow:auto}
aside header{padding:16px;border-bottom:1px solid var(--line)}
aside h1{margin:0;font-size:18px}
aside small{color:var(--muted)}
aside h2{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:16px 16px 6px}
aside button.item{display:block;width:100%;text-align:left;border:0;background:none;color:inherit;padding:7px 16px;font:inherit;cursor:pointer;border-radius:0}
aside button.item:hover{background:var(--bg)}
aside button.item.active{background:var(--mine);font-weight:600}
aside form{display:flex;gap:6px;padding:4px 16px}
aside input{flex:1;min-width:0}
aside .foot{margin-top:auto;padding:16px;border-top:1px solid var(--line)}
main{flex:1;display:flex;flex-direction:column;min-width:0}
main header{padding:14px 20px;border-bottom:1px solid var(--line);background:var(--panel);display:flex;align-items:center;gap:10px}
main header .menu{display:none}
#title{font-weight:600}
.badge{font-size:12px;color:var(--muted);margin-left:auto}
#log{flex:1;overflow:auto;padding:16px 20px;display:flex;flex-direction:column;gap:8px}
.msg{max-width:min(640px,85%);background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:8px 12px}
.msg.mine{align-self:flex-end;background:var(--mine)}
.msg .meta{font-size:12px;color:var(--muted);display:flex;gap:8px}
.msg .ttl.soon{color:var(--warn)}
.msg .text{white-space:pre-wrap;word-wrap:break-word}
.empty{color:var(--muted);text-align:center;margin:auto}
#send{display:flex;gap:8px;padding:12px 20px;border-top:1px solid var(--line);background:var(--panel)}
input,textarea{font:inherit;color:inherit;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 10px}
textarea{flex:1;resize:none;height:42px}
button.primary{background:var(--accent);color:#fff;border:0;border-radius:8px;padding:0 16px;font:inherit;cursor:pointer}
a{color:var(--accent)}
@media (max-width:720px){
 aside{position:fixed;inset:0 auto 0 0;z-index:2;transform:translateX(-100%);transition:transform .2s}
 body.nav aside{transform:none}
 main header .menu{display:inline-block;background:none;border:1px solid var(--line);color:inherit;border-radius:6px;padding:2px 8px}
 #log,#send{padding-left:16px;padding-right:16px}
}
</style>
</head>
<body>
<aside>
 <header><h1>KeyChat</h1><small id="me"></small></header>
 <h2>Rooms</h2>
 <div id="rooms"></div>
 <form id="newroom"><input id="roomname" placeholder="new-room" maxlength="32" aria-label="New room name"><button class="primary" type="submit">+</button></form>
 <h2>Direct messages</h2>
 <div id="users"></div>
 <div class="foot"><small>Messages disappear 24 hours after they're sent.</small><br><a href="/logout">Sign out</a></div>
</aside>
<main>
 <header><button class="menu" id="menu" aria-label="Open menu">☰</button><span id="title">Pick a chat</span><span class="badge" id="status"></span></header>
 <div id="log"><p class="empty">Choose a room or a person on the left.</p></div>
 <form id="send"><textarea id="text" placeholder="Message… (Enter to send, Shift+Enter for a new line)" maxlength="4000" disabled></textarea><button class="primary" disabled>Send</button></form>
</main>
<script>
const $ = (s) => document.querySelector(s);
let me, ws, current, messages = new Map();

async function inflateJSON(buf) {
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return JSON.parse(await new Response(stream).text());
}

function fmtLeft(ms) {
  if (ms <= 0) return "expiring";
  const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000);
  return h ? h + "h " + m + "m left" : m + "m left";
}

function render() {
  const log = $("#log");
  log.replaceChildren();
  if (!messages.size) { const p = document.createElement("p"); p.className = "empty"; p.textContent = "No messages in the last 24 hours."; log.append(p); return; }
  for (const m of messages.values()) {
    const div = document.createElement("div");
    div.className = "msg" + (m.userId === me.id ? " mine" : "");
    div.dataset.id = m.id;
    const meta = document.createElement("div"); meta.className = "meta";
    const who = document.createElement("b"); who.textContent = m.name;
    const when = document.createElement("span"); when.textContent = new Date(m.at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    const ttl = document.createElement("span"); ttl.className = "ttl"; ttl.dataset.exp = m.expiresAt;
    meta.append(who, when, ttl);
    const text = document.createElement("div"); text.className = "text"; text.textContent = m.text;
    div.append(meta, text);
    log.append(div);
  }
  tick();
  log.scrollTop = log.scrollHeight;
}

function tick() {
  const now = Date.now();
  let changed = false;
  for (const [id, m] of messages) if (m.expiresAt <= now) { messages.delete(id); changed = true; }
  if (changed) return render();
  for (const el of document.querySelectorAll(".ttl")) {
    const left = +el.dataset.exp - now;
    el.textContent = "⏳ " + fmtLeft(left);
    el.classList.toggle("soon", left < 3600000);
  }
}
setInterval(tick, 30000);

function open(kind, id, label) {
  if (ws) { ws.onclose = null; ws.close(); }
  current = { kind, id };
  messages = new Map();
  document.body.classList.remove("nav");
  $("#title").textContent = label;
  document.querySelectorAll("aside .item").forEach((b) => b.classList.toggle("active", b.dataset.key === kind + ":" + id));
  $("#status").textContent = "connecting…";
  $("#log").replaceChildren();
  ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws/" + kind + "/" + encodeURIComponent(id));
  ws.binaryType = "arraybuffer";
  ws.onopen = () => { $("#status").textContent = "live · compressed"; $("#text").disabled = false; $("#send button").disabled = false; $("#text").focus(); };
  ws.onmessage = async (e) => {
    const data = typeof e.data === "string" ? JSON.parse(e.data) : await inflateJSON(e.data);
    if (data.type === "history") { for (const m of data.messages) messages.set(m.id, m); render(); }
    else if (data.type === "msg") { messages.set(data.message.id, data.message); render(); }
    else if (data.type === "expired") { for (const id of data.ids) messages.delete(id); render(); }
  };
  ws.onclose = () => { $("#status").textContent = "reconnecting…"; setTimeout(() => current && current.id === id && open(kind, id, label), 2000); };
}

function item(container, kind, id, label) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "item"; b.dataset.key = kind + ":" + id;
  b.textContent = (kind === "room" ? "# " : "@ ") + label;
  b.onclick = () => open(kind, id, (kind === "room" ? "#" : "@") + label);
  container.append(b);
}

async function loadRooms() {
  const rooms = await (await fetch("/api/rooms")).json();
  $("#rooms").replaceChildren(); rooms.forEach((r) => item($("#rooms"), "room", r, r));
  return rooms;
}

$("#newroom").onsubmit = async (e) => {
  e.preventDefault();
  const name = $("#roomname").value.trim().toLowerCase();
  if (!name) return;
  const res = await fetch("/api/rooms", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ name }) });
  const body = await res.json();
  if (!res.ok) return alert(body.error);
  $("#roomname").value = "";
  await loadRooms();
  open("room", body.name, "#" + body.name);
};

$("#send").onsubmit = (e) => {
  e.preventDefault();
  const text = $("#text").value.trim();
  if (!text || !ws || ws.readyState !== 1) return;
  ws.send(JSON.stringify({ type: "msg", text }));
  $("#text").value = "";
};
$("#text").onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#send").requestSubmit(); } };
$("#menu").onclick = () => document.body.classList.toggle("nav");

(async () => {
  me = await (await fetch("/api/me")).json();
  $("#me").textContent = "Signed in as " + me.name;
  const rooms = await loadRooms();
  const users = await (await fetch("/api/users")).json();
  if (!users.length) { const s = document.createElement("small"); s.style.padding = "0 16px"; s.textContent = "No other users yet."; $("#users").append(s); }
  users.forEach((u) => item($("#users"), "dm", u.id, u.name));
  if (rooms.includes("general")) open("room", "general", "#general");
})();
</script>
</body>
</html>`;
