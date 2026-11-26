// The chat front end: a single page served by the Worker.
export const APP_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DarkChat</title>
<style>
:root{color-scheme:dark;--bg:#0d0d12;--panel:#16161f;--line:#272734;--text:#ececf3;--muted:#9696ab;--accent:#8b7bff;--mine:#262046;--warn:#fb923c}
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
.msg img,.msg video{display:block;max-width:100%;max-height:320px;height:auto;border-radius:8px;margin-top:6px;background:#000}
.msg .size{font-size:11px;color:var(--muted)}
#compose{position:relative;border-top:1px solid var(--line);background:var(--panel)}
#compose #send{border-top:0}
.tool{background:none;border:1px solid var(--line);color:inherit;border-radius:8px;padding:0 10px;font:inherit;font-weight:600;cursor:pointer}
.tool:disabled{opacity:.4;cursor:default}
#note{font-size:13px;color:var(--muted);padding:8px 20px 0}
#note:empty{display:none}
#gifpanel{position:absolute;left:12px;right:12px;bottom:100%;max-height:min(420px,60dvh);display:flex;flex-direction:column;gap:8px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:10px;box-shadow:0 10px 30px #0008}
#gifpanel[hidden]{display:none}
#gifgrid{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px}
#gifgrid button{border:0;padding:0;background:#000;border-radius:6px;cursor:pointer;aspect-ratio:1;overflow:hidden}
#gifgrid img{width:100%;height:100%;object-fit:cover;display:block}
#gifpanel small{color:var(--muted);text-align:right}
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
 <header><h1>DarkChat</h1><small id="me"></small></header>
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
 <div id="compose">
  <div id="gifpanel" hidden><input id="gifq" placeholder="Search GIFs" aria-label="Search GIFs"><div id="gifgrid"></div><small>Powered by KLIPY</small></div>
  <div id="note" role="status"></div>
  <form id="send">
   <button type="button" class="tool" id="gifbtn" disabled aria-label="Send a GIF">GIF</button>
   <button type="button" class="tool" id="vidbtn" disabled aria-label="Send a video">🎬</button>
   <input type="file" id="vidfile" accept="video/*" hidden>
   <textarea id="text" placeholder="Message… (Enter to send, Shift+Enter for a new line)" maxlength="4000" disabled></textarea><button class="primary" disabled>Send</button>
  </form>
 </div>
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
    div.append(meta);
    if (m.text) { const text = document.createElement("div"); text.className = "text"; text.textContent = m.text; div.append(text); }
    if (m.media && m.media.kind === "gif") {
      const img = document.createElement("img"); img.src = m.media.url; img.alt = "GIF"; img.loading = "lazy";
      img.width = m.media.w; img.height = m.media.h; div.append(img);
    } else if (m.media && m.media.kind === "video") {
      const v = document.createElement("video"); v.src = "/" + m.media.key; v.controls = true; v.preload = "metadata"; v.playsInline = true;
      v.width = m.media.w; v.height = m.media.h; div.append(v);
      const sz = document.createElement("div"); sz.className = "size"; sz.textContent = (m.media.size / 1048576).toFixed(2) + " MB"; div.append(sz);
    }
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
  ws.onopen = () => { $("#status").textContent = "live · compressed"; document.querySelectorAll("#send button, #text").forEach((el) => el.disabled = false); $("#text").focus(); };
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
function sendMedia(media) {
  if (!ws || ws.readyState !== 1) return false;
  ws.send(JSON.stringify({ type: "msg", text: "", media }));
  return true;
}
const note = (t) => { $("#note").textContent = t; };

// ---- GIFs (Klipy, proxied through /api/gifs) ----
let gifTimer;
async function loadGifs(q) {
  const grid = $("#gifgrid");
  grid.textContent = "Loading…";
  const res = await fetch("/api/gifs?q=" + encodeURIComponent(q));
  const body = await res.json().catch(() => ({ error: "Couldn't load GIFs." }));
  grid.replaceChildren();
  if (!res.ok) { grid.textContent = body.error; return; }
  if (!body.gifs.length) { grid.textContent = "No GIFs found."; return; }
  for (const g of body.gifs) {
    const b = document.createElement("button"); b.type = "button"; b.title = g.title;
    const img = document.createElement("img"); img.src = g.preview; img.alt = g.title || "GIF"; img.loading = "lazy";
    b.append(img);
    b.onclick = () => { if (sendMedia({ kind: "gif", url: g.url, w: g.w, h: g.h })) $("#gifpanel").hidden = true; };
    grid.append(b);
  }
}
$("#gifbtn").onclick = () => {
  const p = $("#gifpanel"); p.hidden = !p.hidden;
  if (!p.hidden) { $("#gifq").focus(); if (!$("#gifgrid").childElementCount) loadGifs(""); }
};
$("#gifq").oninput = () => { clearTimeout(gifTimer); gifTimer = setTimeout(() => loadGifs($("#gifq").value.trim()), 300); };
document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("#gifpanel").hidden = true; });

// ---- Video: re-encode in the browser to the smallest file, capped at 3 MB ----
const VIDEO_TARGET = 2.5 * 1048576, VIDEO_MAX = 3 * 1048576, VIDEO_MAX_SECONDS = 180;
const MIMES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4;codecs=avc1,mp4a.40.2", "video/mp4"];

async function compressVideo(file, onProgress) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw new Error("Your browser can't compress video. Try Chrome, Edge or Firefox.");
  const mime = MIMES.find((m) => MediaRecorder.isTypeSupported(m));
  if (!mime) throw new Error("Your browser can't record WebM or MP4.");
  const src = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.src = src; v.playsInline = true; v.preload = "auto";
  try {
    await new Promise((ok, fail) => { v.onloadedmetadata = ok; v.onerror = () => fail(new Error("This video format can't be opened in your browser.")); });
    // Browser-recorded WebM often reports an infinite length until you seek to the end.
    if (!isFinite(v.duration)) {
      await new Promise((ok) => { v.ondurationchange = () => isFinite(v.duration) && ok(); v.currentTime = 1e9; setTimeout(ok, 5000); });
      v.ondurationchange = null;
    }
    const dur = v.duration;
    if (!isFinite(dur) || dur <= 0) throw new Error("Couldn't read the video's length.");
    if (dur > VIDEO_MAX_SECONDS) throw new Error("Videos can be up to 3 minutes long so they fit in 3 MB.");

    // Route the sound into the recorder only, so it isn't played out loud while encoding.
    const ac = new AudioContext();
    const dest = ac.createMediaStreamDestination();
    ac.createMediaElementSource(v).connect(dest);

    let budget = VIDEO_TARGET, best = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const out = await encodeOnce(v, dur, budget, mime, dest, (p) => onProgress(p, attempt));
      if (!best || out.blob.size < best.blob.size) best = out;
      if (out.blob.size <= VIDEO_MAX) break;
      budget *= (VIDEO_MAX / out.blob.size) * 0.8;
    }
    ac.close();
    // Keep the original if it's already a small, playable file and smaller than our re-encode.
    if (["video/webm", "video/mp4"].includes(file.type) && file.size <= VIDEO_MAX && file.size < best.blob.size) {
      best = { blob: file, w: v.videoWidth, h: v.videoHeight };
    }
    if (best.blob.size > VIDEO_MAX) throw new Error("Couldn't get this video under 3 MB. Try a shorter clip.");
    return best;
  } finally {
    URL.revokeObjectURL(src);
  }
}

async function encodeOnce(v, dur, budgetBytes, mime, audioDest, onProgress) {
  const total = (budgetBytes * 8) / dur * 0.93;
  const audioBps = total > 500000 ? 64000 : total > 200000 ? 32000 : 0;
  const videoBps = Math.max(60000, total - audioBps);
  // Smaller picture for smaller budgets; never above 720p.
  const cap = videoBps >= 1200000 ? 720 : videoBps >= 600000 ? 480 : videoBps >= 250000 ? 360 : 240;
  const scale = Math.min(1, cap / Math.min(v.videoWidth, v.videoHeight));
  const w = Math.max(2, Math.round(v.videoWidth * scale / 2) * 2), h = Math.max(2, Math.round(v.videoHeight * scale / 2) * 2);
  const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
  const g = canvas.getContext("2d");
  const stream = canvas.captureStream(cap <= 360 ? 24 : 30);
  if (audioBps) audioDest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: videoBps, audioBitsPerSecond: audioBps || undefined });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise((ok) => (rec.onstop = ok));

  v.currentTime = 0;
  await new Promise((ok) => { v.onseeked = ok; });
  let done = false;
  const draw = () => {
    if (done) return;
    g.drawImage(v, 0, 0, w, h);
    onProgress(Math.min(1, v.currentTime / dur));
    v.requestVideoFrameCallback ? v.requestVideoFrameCallback(draw) : requestAnimationFrame(draw);
  };
  rec.start(1000);
  await v.play();
  draw();
  await new Promise((ok) => { v.onended = ok; });
  done = true;
  rec.stop();
  await stopped;
  return { blob: new Blob(chunks, { type: mime.split(";")[0] }), w, h };
}

$("#vidbtn").onclick = () => $("#vidfile").click();
$("#vidfile").onchange = async () => {
  const file = $("#vidfile").files[0];
  $("#vidfile").value = "";
  if (!file) return;
  $("#vidbtn").disabled = true;
  try {
    const before = (file.size / 1048576).toFixed(1);
    const out = await compressVideo(file, (p, attempt) => note("Compressing video" + (attempt ? " (pass " + (attempt + 1) + ")" : "") + "… " + Math.round(p * 100) + "% — keep this tab open"));
    note("Uploading " + (out.blob.size / 1048576).toFixed(2) + " MB (was " + before + " MB)…");
    const res = await fetch("/api/media", { method: "POST", headers: { "Content-Type": out.blob.type }, body: out.blob });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Upload failed.");
    if (!sendMedia({ kind: "video", key: body.key, w: out.w, h: out.h, size: body.size })) throw new Error("Not connected — try again.");
    note("");
  } catch (err) {
    note(err.message);
  } finally {
    $("#vidbtn").disabled = false;
  }
};

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
