// The chat front end: a single page served by the Worker.
export const APP_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#06060b">
<title>DarkChat</title>
<style>
:root{color-scheme:dark;--bg:#0d0d0f;--glass:rgba(255,255,255,.035);--glass-2:rgba(255,255,255,.055);--glass-hi:rgba(255,255,255,.085);--line:rgba(255,255,255,.08);--line-2:rgba(255,255,255,.14);--text:#e8e6e3;--muted:#a19d97;--dim:#6f6b66;--accent:#c9a46b;--accent-ink:#1a1408;--ok:#7fb48a;--warn:#d6a85a;--danger:#d98282;--verified:#7aa5d6;--r:10px;--blur:blur(10px)}
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{height:100%}
body{margin:0;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif;background:var(--bg);color:var(--text);display:flex;gap:12px;padding:12px;height:100dvh;overflow:hidden;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:0;z-index:-1;background:radial-gradient(120% 80% at 30% 0%,#1a1a1d 0%,#0d0d0f 60%)}
.glass{background:var(--glass);border:1px solid var(--line);border-radius:var(--r);backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur)}
button{font:inherit;color:inherit;cursor:pointer}
input,textarea,select{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}

/* sidebar */
aside{width:272px;flex:none;display:flex;flex-direction:column;overflow:hidden}
.brand{display:flex;align-items:center;gap:10px;padding:18px 18px 10px}
.logo{width:26px;height:26px;border-radius:6px;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center;font-weight:800;font-size:14px}
.brand b{font-size:17px;letter-spacing:-.01em}
.scroll{flex:1;overflow:auto;padding:4px 10px 10px}
.section{display:flex;align-items:center;justify-content:space-between;margin:14px 8px 6px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}
.icon-btn{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:9px;border:1px solid transparent;background:none;color:var(--muted)}
.icon-btn:hover{background:var(--glass-2);border-color:var(--line);color:var(--text)}
.item{display:flex;align-items:center;gap:10px;width:100%;padding:7px 8px;border:1px solid transparent;border-radius:12px;background:none;text-align:left;color:var(--muted);transition:background .15s,color .15s}
.item:hover{background:var(--glass-2);color:var(--text)}
.item.active{background:var(--glass-hi);border-color:var(--line-2);color:var(--text)}
.item .label{flex:1;min-width:0;display:flex;align-items:center;gap:5px;overflow:hidden;white-space:nowrap}
.item .label span{overflow:hidden;text-overflow:ellipsis}
.hash{width:28px;height:28px;flex:none;border-radius:9px;display:grid;place-items:center;background:var(--glass-2);border:1px solid var(--line);color:var(--muted);font-weight:600}
#newroom{display:none;gap:6px;margin:4px 4px 6px}
#newroom.show{display:flex}
.field{flex:1;min-width:0;background:rgba(0,0,0,.25);border:1px solid var(--line);border-radius:10px;padding:7px 10px}
.field:focus{border-color:var(--accent);outline:none}
.empty-small{color:var(--dim);font-size:13px;padding:4px 10px}
.mecard{display:flex;align-items:center;gap:10px;margin:10px;padding:10px;border-radius:14px;background:var(--glass-2);border:1px solid var(--line)}
.mecard .who{flex:1;min-width:0}
.mecard .who div{display:flex;flex-wrap:wrap;align-items:center;gap:4px;font-weight:600}
.mecard .badges{flex-wrap:wrap}
.mecard small{color:var(--dim);font-size:12px}

/* avatars & badges */
.av{width:32px;height:32px;flex:none;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:700;color:#fff;background:hsl(var(--h) 18% 30%);color:#eee}
.av.sm{width:28px;height:28px;font-size:12px}
.badges{display:inline-flex;align-items:center;gap:4px;flex:none}
.vf{width:15px;height:15px;flex:none;color:var(--verified)}
.tag{font-size:11px;font-weight:600;text-transform:lowercase;color:var(--dim)}
.tag.admin{color:var(--danger)}
.tag.mod{color:var(--ok)}
.tag.early{color:var(--warn)}

/* main */
main{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}
.top{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line)}
.top .menu{display:none}
#title{font-weight:650;font-size:16px;display:flex;align-items:center;gap:6px;min-width:0}
#status{margin-left:auto;display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)}
#status::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--dim)}
#status.live::before{background:var(--ok)}
.hint{font-size:12px;color:var(--dim);display:flex;align-items:center;gap:5px}
#log{flex:1;overflow:auto;padding:18px 18px 8px;display:flex;flex-direction:column}
.group{display:flex;gap:10px;margin-top:14px;max-width:min(720px,92%)}
.group.mine{align-self:flex-end;flex-direction:row-reverse}
.group .body{min-width:0;display:flex;flex-direction:column;gap:3px}
.group.mine .body{align-items:flex-end}
.head{display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:1px}
.head b{font-weight:650}
.head time,.head .ttl{color:var(--dim);font-size:11.5px}
.head .ttl.soon{color:var(--warn)}
.bubble{padding:8px 12px;border-radius:10px;background:var(--glass-2);border:1px solid var(--line);white-space:pre-wrap;overflow-wrap:anywhere;width:fit-content;max-width:100%}
.mine .bubble{background:rgba(201,164,107,.16);border-color:rgba(201,164,107,.3)}
.media{display:block;max-width:min(100%,360px);max-height:320px;height:auto;border-radius:14px;border:1px solid var(--line);background:#000}
.size{font-size:11px;color:var(--dim)}
.empty{margin:auto;text-align:center;color:var(--muted)}

/* composer */
#compose{position:relative;padding:10px 14px 14px}
#note{font-size:13px;color:var(--muted);padding:0 6px 8px}
#note:empty{display:none}
#send{display:flex;align-items:flex-end;gap:6px;padding:6px;border-radius:10px}
#text{flex:1;resize:none;border:0;background:none;padding:8px 6px;max-height:160px;min-height:38px;height:38px;outline:none;line-height:1.45}
.tool{height:38px;min-width:38px;padding:0 10px;border-radius:14px;border:1px solid transparent;background:none;color:var(--muted);font-weight:700;font-size:12px;letter-spacing:.04em}
.tool:hover:not(:disabled){background:var(--glass-2);border-color:var(--line);color:var(--text)}
.tool:disabled,.send:disabled{opacity:.35;cursor:default}
.send{width:38px;height:38px;border-radius:8px;border:0;display:grid;place-items:center;color:var(--accent-ink);background:var(--accent)}
#gifpanel{position:absolute;left:14px;right:14px;bottom:calc(100% - 6px);max-height:min(440px,60dvh);display:flex;flex-direction:column;gap:8px;padding:10px;z-index:5;background:rgba(20,20,22,.92)}
#gifpanel[hidden]{display:none}
#gifgrid{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px;color:var(--muted);font-size:14px}
#gifgrid button{border:0;padding:0;background:#000;border-radius:10px;aspect-ratio:1;overflow:hidden}
#gifgrid img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .2s}
#gifgrid button:hover img{transform:scale(1.06)}
#gifpanel small{color:var(--dim);text-align:right;font-size:11px}

/* admin */
dialog{width:min(720px,calc(100vw - 24px));max-height:min(640px,calc(100dvh - 24px));padding:0;color:var(--text);background:rgba(20,20,22,.94)}
dialog::backdrop{background:rgba(0,0,0,.6)}
dialog[open]{display:flex;flex-direction:column}
.dhead{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid var(--line)}
.dhead b{font-size:16px}
.dhead .field{max-width:220px;margin-left:auto}
#adminlist{overflow:auto;padding:8px 10px 12px}
.urow{display:flex;align-items:center;gap:10px;padding:8px;border-radius:12px}
.urow:hover{background:var(--glass)}
.urow .who{flex:1;min-width:0}
.urow .who div{display:flex;align-items:center;gap:5px;font-weight:600}
.urow small{color:var(--dim);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.switch{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);cursor:pointer}
.switch input{appearance:none;width:34px;height:20px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid var(--line);position:relative;cursor:pointer;transition:background .15s}
.switch input::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .15s}
.switch input:checked{background:var(--verified)}
.switch input:checked::after{transform:translateX(14px)}
.urow select{background:rgba(0,0,0,.3);border:1px solid var(--line);border-radius:9px;padding:5px 8px}
/* From Uiverse.io by kennyotsu - https://uiverse.io/kennyotsu/fresh-lizard-20
MIT License, Copyright (c) kennyotsu (kotsu)
   Word-spinner loader, adapted for DarkChat: classes prefixed dc-ld, DarkChat font and accent.
   --ld-bg must match the color behind the loader so the top/bottom fade blends in. */
.dc-ld-card{background:#17171a;border:1px solid var(--line);padding:1rem 2rem;border-radius:var(--r)}
.dc-ld{--ld-bg:#151517;color:var(--dim);font-weight:500;font-size:25px;line-height:40px;box-sizing:content-box;height:40px;padding:10px;display:flex;border-radius:8px}
.dc-ld-card .dc-ld{--ld-bg:#17171a}
.dc-ld p{margin:0}
.dc-ld-words{overflow:hidden;position:relative}
.dc-ld-words::after{content:"";position:absolute;inset:0;background:linear-gradient(var(--ld-bg) 10%,transparent 30%,transparent 70%,var(--ld-bg) 90%);z-index:20}
.dc-ld-word{display:block;height:100%;padding-left:6px;color:var(--accent);animation:dc-ld-spin 4s infinite}
@keyframes dc-ld-spin{10%{transform:translateY(-102%)}25%{transform:translateY(-100%)}35%{transform:translateY(-202%)}50%{transform:translateY(-200%)}60%{transform:translateY(-302%)}75%{transform:translateY(-300%)}85%{transform:translateY(-402%)}100%{transform:translateY(-400%)}}
.dc-ld.sm{font-size:15px;line-height:24px;height:24px;padding:2px 0}
#gifgrid .dc-ld{--ld-bg:#141416;grid-column:1/-1;justify-self:center;margin-top:12px}
.ld-center{margin:auto}
#boot{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:var(--bg);transition:opacity .3s}
#boot.done{opacity:0;pointer-events:none}
#note{display:flex;align-items:center;gap:10px}
/* From Uiverse.io by chase2k25 - https://uiverse.io/chase2k25/slimy-chipmunk-97
MIT License, Copyright (c) chase2k25 (chandu.exe)
   Glass radio group, used for the "coming soon" plans picker. Classes prefixed dc-, look and motion unchanged.
   Inputs are visually hidden (not display:none) so the picker also works with the keyboard. */
.dc-glass-radio-group{--bg:rgba(255,255,255,0.06);--text:#e5e5e5;display:flex;position:relative;background:var(--bg);border-radius:1rem;backdrop-filter:blur(12px);box-shadow:inset 1px 1px 4px rgba(255,255,255,0.2),inset -1px -1px 6px rgba(0,0,0,0.3),0 4px 12px rgba(0,0,0,0.15);overflow:hidden;width:fit-content;max-width:100%}
.dc-glass-radio-group input{position:absolute;opacity:0;width:1px;height:1px;margin:0;pointer-events:none}
.dc-glass-radio-group label{flex:1;display:flex;align-items:center;justify-content:center;min-width:80px;font-size:14px;padding:.8rem 1.6rem;cursor:pointer;font-weight:600;letter-spacing:.3px;color:var(--text);position:relative;z-index:2;transition:color .3s ease-in-out}
.dc-glass-radio-group label:hover{color:white}
.dc-glass-radio-group input:checked + label{color:#fff}
.dc-glass-radio-group input:focus-visible + label{outline:2px solid #fff;outline-offset:-4px;border-radius:1rem}
.dc-glass-glider{position:absolute;top:0;bottom:0;width:calc(100% / 3);border-radius:1rem;z-index:1;transition:transform .5s cubic-bezier(0.37,1.95,0.66,0.56),background .4s ease-in-out,box-shadow .4s ease-in-out}
#dc-plan-silver:checked ~ .dc-glass-glider{transform:translateX(0%);background:linear-gradient(135deg,#c0c0c055,#e0e0e0);box-shadow:0 0 18px rgba(192,192,192,0.5),0 0 10px rgba(255,255,255,0.4) inset}
#dc-plan-gold:checked ~ .dc-glass-glider{transform:translateX(100%);background:linear-gradient(135deg,#ffd70055,#ffcc00);box-shadow:0 0 18px rgba(255,215,0,0.5),0 0 10px rgba(255,235,150,0.4) inset}
#dc-plan-platinum:checked ~ .dc-glass-glider{transform:translateX(200%);background:linear-gradient(135deg,#d0e7ff55,#a0d8ff);box-shadow:0 0 18px rgba(160,216,255,0.5),0 0 10px rgba(200,240,255,0.4) inset}

/* plans window */
#plans{width:min(460px,calc(100vw - 24px))}
.plans-body{padding:18px;display:flex;flex-direction:column;align-items:center;gap:16px}
.soon{font-size:11px;font-weight:600;color:var(--warn);text-transform:lowercase}
#planperks{align-self:stretch;margin:0;padding:14px 16px 14px 34px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--muted);min-height:118px}
#planperks li{margin:3px 0}
.plans-foot{font-size:12.5px;color:var(--dim);text-align:center;margin:0}
#toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);opacity:0;padding:10px 16px;border-radius:14px;transition:.2s;pointer-events:none;z-index:20;font-size:14px;background:rgba(20,20,22,.95)}
#toast.show{opacity:1;transform:translateX(-50%)}

@media (max-width:760px){
 body{padding:0;gap:0}
 .glass{border-radius:0}
 aside{position:fixed;inset:0 auto 0 0;z-index:10;width:min(300px,86vw);transform:translateX(-105%);transition:transform .22s;background:rgba(16,16,18,.97)}
 body.nav aside{transform:none}
 main{border:0}
 .top .menu{display:inline-grid}
 #log{padding:12px 12px 6px}
 .group{max-width:96%}
 #compose{padding:8px 8px calc(8px + env(safe-area-inset-bottom))}
 .hint{display:none}
 .urow{flex-wrap:wrap}
 .urow .who{flex-basis:calc(100% - 42px)}
 .urow .switch{margin-left:42px}
}
</style>
</head>
<body>
<aside class="glass" aria-label="Chats">
 <div class="brand"><div class="logo" aria-hidden="true">D</div><b>DarkChat</b></div>
 <div class="scroll">
  <div class="section">Rooms <button class="icon-btn" id="addroom" type="button" aria-label="New room" title="New room"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>
  <form id="newroom"><input class="field" id="roomname" placeholder="room-name" maxlength="32" aria-label="New room name" autocomplete="off"></form>
  <div id="rooms"></div>
  <div class="section">Direct messages</div>
  <div id="users"></div>
 </div>
 <div class="mecard">
  <div class="av sm" id="meav"></div>
  <div class="who"><div id="mename"></div><small id="merole">Signed in</small></div>
  <button class="icon-btn" id="plansbtn" type="button" aria-label="Plans (coming soon)" title="Plans (coming soon)"><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12l3 5-9 13L3 8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M3 8h18M9 3l3 18 3-18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg></button>
  <button class="icon-btn" id="adminbtn" type="button" hidden aria-label="Admin panel" title="Admin panel"><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  <a class="icon-btn" href="/logout" aria-label="Sign out" title="Sign out"><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l5-5-5-5M15 12H3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
 </div>
</aside>
<main class="glass">
 <div class="top">
  <button class="icon-btn menu" id="menu" type="button" aria-label="Open chats"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
  <div id="title">Pick a chat</div>
  <span class="hint" title="Messages, GIFs and videos are deleted 24 hours after they're sent">messages delete after 24h</span>
  <span id="status">offline</span>
 </div>
 <div id="log"><div class="empty">Pick a room or a person on the left.</div></div>
 <div id="compose">
  <div id="gifpanel" class="glass" hidden><input class="field" id="gifq" placeholder="Search GIFs" aria-label="Search GIFs" autocomplete="off"><div id="gifgrid"></div><small>Powered by KLIPY</small></div>
  <div id="note" role="status"></div>
  <form id="send" class="glass">
   <button type="button" class="tool" id="gifbtn" disabled aria-label="Send a GIF" title="GIF">GIF</button>
   <button type="button" class="tool" id="vidbtn" disabled aria-label="Send a video" title="Video (compressed to 3 MB max)"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 10.5l5-3v9l-5-3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>
   <input type="file" id="vidfile" accept="video/*" hidden>
   <label class="sr" for="text">Message</label>
   <textarea id="text" placeholder="Message" maxlength="4000" rows="1" disabled></textarea>
   <button class="send" disabled aria-label="Send"><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M12 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  </form>
 </div>
</main>
<dialog id="admin" class="glass" aria-label="Admin panel">
 <div class="dhead"><b>Members</b><input class="field" id="adminq" placeholder="Search name or email" aria-label="Search members" autocomplete="off"><button class="icon-btn" id="adminclose" type="button" aria-label="Close">✕</button></div>
 <div id="adminlist"></div>
</dialog>
<dialog id="plans" class="glass" aria-labelledby="planstitle">
 <div class="dhead"><b id="planstitle">Plans</b><span class="soon">coming soon</span><button class="icon-btn" id="plansclose" type="button" aria-label="Close" style="margin-left:auto">✕</button></div>
 <div class="plans-body">
  <!-- From Uiverse.io by chase2k25 - https://uiverse.io/chase2k25/slimy-chipmunk-97
MIT License, Copyright (c) chase2k25 (chandu.exe) -->
  <div class="dc-glass-radio-group" role="radiogroup" aria-label="Plan">
   <input type="radio" name="dc-plan" id="dc-plan-silver" value="silver" checked>
   <label for="dc-plan-silver">Silver</label>
   <input type="radio" name="dc-plan" id="dc-plan-gold" value="gold">
   <label for="dc-plan-gold">Gold</label>
   <input type="radio" name="dc-plan" id="dc-plan-platinum" value="platinum">
   <label for="dc-plan-platinum">Platinum</label>
   <div class="dc-glass-glider"></div>
  </div>
  <ul id="planperks" aria-live="polite"></ul>
  <p class="plans-foot">Paid plans aren't available yet. Nothing can be bought and nothing is charged.</p>
 </div>
</dialog>
<div id="toast" class="glass" role="status" aria-live="polite"></div>
<template id="tpl-check"><svg class="vf" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M5 8.2l2 2 4-4.2" fill="none" stroke="#0d0d0f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></template>
<script>
const $ = (s) => document.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
let me, ws, current, messages = new Map(), users = new Map();

function toast(t) { const n = $("#toast"); n.textContent = t; n.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => n.classList.remove("show"), 3200); }
// ---- Loader ----
// From Uiverse.io by kennyotsu - https://uiverse.io/kennyotsu/fresh-lizard-20
// MIT License, Copyright (c) kennyotsu (kotsu)
const LOADER_WORDS = {
  chat: ["rooms", "messages", "members", "gifs", "rooms"],
  video: ["video", "frames", "audio", "upload", "video"],
  gif: ["gifs", "reactions", "memes", "trending", "gifs"],
};
function loader(words, small) {
  const box = el("div", "dc-ld" + (small ? " sm" : ""));
  box.setAttribute("role", "status");
  box.setAttribute("aria-label", "Loading");
  const list = el("div", "dc-ld-words");
  list.setAttribute("aria-hidden", "true");
  for (const w of words) list.append(el("span", "dc-ld-word", w));
  box.append(el("p", "", "loading"), list);
  return box;
}
function loaderCard(words) { const c = el("div", "dc-ld-card"); c.append(loader(words)); return c; }
const boot = el("div"); boot.id = "boot"; boot.append(loaderCard(LOADER_WORDS.chat)); document.body.append(boot);

const note = (t) => { $("#note").textContent = t; };
// Progress text next to a loader; the loader is kept between updates so its animation doesn't restart.
function busyNote(t) {
  const n = $("#note");
  let span = n.querySelector(".note-text");
  if (!span) { span = el("span", "note-text"); n.replaceChildren(loader(LOADER_WORDS.video, true), span); }
  span.textContent = t;
}

function hue(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
function avatar(name, small) {
  const a = el("div", "av" + (small ? " sm" : ""), (name || "?").slice(0, 1).toUpperCase());
  a.style.setProperty("--h", hue(name || "?"));
  a.setAttribute("aria-hidden", "true");
  return a;
}
function badges(u) {
  const b = el("span", "badges");
  if (!u) return b;
  if (u.verified) { const c = $("#tpl-check").content.firstElementChild.cloneNode(true); const t = document.createElementNS("http://www.w3.org/2000/svg", "title"); t.textContent = "Verified"; c.prepend(t); c.setAttribute("role", "img"); c.setAttribute("aria-label", "Verified"); b.append(c); }
  if (u.role === "admin") b.append(Object.assign(el("span", "tag admin", "admin"), { title: "Admin" }));
  else if (u.role === "mod") b.append(Object.assign(el("span", "tag mod", "mod"), { title: "Moderator" }));
  if (u.early) b.append(Object.assign(el("span", "tag early", "early"), { title: "One of the first 100 members" }));
  return b;
}

async function inflateJSON(buf) {
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return JSON.parse(await new Response(stream).text());
}

function fmtLeft(ms) {
  if (ms <= 0) return "deleting";
  const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000);
  return "gone in " + (h ? h + "h" : m + "m");
}

function render() {
  const log = $("#log");
  const stick = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  log.replaceChildren();
  if (!messages.size) {
    const e = el("div", "empty", "Nothing here from the last 24 hours.");
    log.append(e); return;
  }
  let group = null, last = null;
  for (const m of messages.values()) {
    const mine = m.userId === me.id;
    if (!last || last.userId !== m.userId || m.at - last.at > 5 * 60000) {
      const u = users.get(m.userId);
      group = el("div", "group" + (mine ? " mine" : ""));
      const body = el("div", "body");
      const head = el("div", "head");
      if (!mine) head.append(el("b", "", m.name), badges(u));
      const time = el("time", "", new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      time.dateTime = new Date(m.at).toISOString();
      const ttl = el("span", "ttl"); ttl.dataset.exp = m.expiresAt;
      head.append(time, ttl);
      body.append(head);
      if (!mine) group.append(avatar(m.name));
      group.append(body);
      log.append(group);
    }
    const body = group.lastElementChild;
    if (m.text) body.append(el("div", "bubble", m.text));
    if (m.media && m.media.kind === "gif") {
      const img = el("img", "media"); img.src = m.media.url; img.alt = "GIF"; img.loading = "lazy";
      img.width = m.media.w; img.height = m.media.h; body.append(img);
    } else if (m.media && m.media.kind === "video") {
      const v = el("video", "media"); v.src = "/" + m.media.key; v.controls = true; v.preload = "metadata"; v.playsInline = true;
      v.width = m.media.w; v.height = m.media.h; body.append(v, el("div", "size", (m.media.size / 1048576).toFixed(2) + " MB"));
    }
    last = m;
  }
  tick();
  if (stick) log.scrollTop = log.scrollHeight;
}

function tick() {
  const now = Date.now();
  let changed = false;
  for (const [id, m] of messages) if (m.expiresAt <= now) { messages.delete(id); changed = true; }
  if (changed) return render();
  for (const t of document.querySelectorAll(".ttl")) {
    const left = +t.dataset.exp - now;
    t.textContent = "· " + fmtLeft(left);
    t.classList.toggle("soon", left < 3600000);
  }
}
setInterval(tick, 30000);

function setStatus(text, live) { const s = $("#status"); s.textContent = text; s.classList.toggle("live", !!live); }

function open(kind, id) {
  if (ws) { ws.onclose = null; ws.close(); }
  current = { kind, id };
  messages = new Map();
  document.body.classList.remove("nav");
  $("#gifpanel").hidden = true;
  const title = $("#title"); title.replaceChildren();
  if (kind === "room") title.append(el("span", "", "# " + id));
  else { const u = users.get(id); title.append(avatar(u ? u.name : "?", true), el("span", "", u ? u.name : "Direct message"), badges(u)); }
  document.querySelectorAll(".item").forEach((b) => b.classList.toggle("active", b.dataset.key === kind + ":" + id));
  setStatus("connecting…");
  const waiting = loaderCard(LOADER_WORDS.chat); waiting.classList.add("ld-center");
  $("#log").replaceChildren(waiting);
  ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws/" + kind + "/" + encodeURIComponent(id));
  ws.binaryType = "arraybuffer";
  ws.onopen = () => { setStatus("live", true); document.querySelectorAll("#send button, #text").forEach((b) => b.disabled = false); $("#text").focus(); };
  ws.onmessage = async (e) => {
    const data = typeof e.data === "string" ? JSON.parse(e.data) : await inflateJSON(e.data);
    if (data.type === "history") { for (const m of data.messages) messages.set(m.id, m); render(); $("#log").scrollTop = 1e9; }
    else if (data.type === "msg") { messages.set(data.message.id, data.message); render(); if (data.message.userId === me.id) $("#log").scrollTop = 1e9; }
    else if (data.type === "expired") { for (const id of data.ids) messages.delete(id); render(); }
  };
  ws.onclose = () => { setStatus("reconnecting…"); setTimeout(() => current && current.id === id && open(kind, id), 2000); };
}

function roomItem(name) {
  const b = el("button", "item"); b.type = "button"; b.dataset.key = "room:" + name;
  const label = el("span", "label"); label.append(el("span", "", name));
  b.append(el("span", "hash", "#"), label);
  b.onclick = () => open("room", name);
  return b;
}
function userItem(u) {
  const b = el("button", "item"); b.type = "button"; b.dataset.key = "dm:" + u.id;
  const label = el("span", "label"); label.append(el("span", "", u.name), badges(u));
  b.append(avatar(u.name, true), label);
  b.onclick = () => open("dm", u.id);
  return b;
}

async function loadRooms() {
  const rooms = await (await fetch("/api/rooms")).json();
  $("#rooms").replaceChildren(...rooms.map(roomItem));
  markActive();
  return rooms;
}
async function loadUsers() {
  const list = await (await fetch("/api/users")).json();
  users = new Map(list.map((u) => [u.id, u]));
  me = users.get(me.id) || me;
  const others = list.filter((u) => u.id !== me.id);
  $("#users").replaceChildren(...(others.length ? others.map(userItem) : [el("div", "empty-small", "No other members yet.")]));
  $("#meav").replaceWith(Object.assign(avatar(me.name, true), { id: "meav" }));
  const mn = $("#mename"); mn.replaceChildren(el("span", "", me.name), badges(me));
  $("#merole").textContent = me.role === "admin" ? "Admin" : me.role === "mod" ? "Moderator" : me.verified ? "Verified member" : "Member";
  $("#adminbtn").hidden = me.role !== "admin";
  markActive();
}
function markActive() { if (current) document.querySelectorAll(".item").forEach((b) => b.classList.toggle("active", b.dataset.key === current.kind + ":" + current.id)); }

$("#addroom").onclick = () => { const f = $("#newroom"); f.classList.toggle("show"); if (f.classList.contains("show")) $("#roomname").focus(); };
$("#newroom").onsubmit = async (e) => {
  e.preventDefault();
  const name = $("#roomname").value.trim().toLowerCase();
  if (!name) return;
  const res = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
  const body = await res.json();
  if (!res.ok) return toast(body.error);
  $("#roomname").value = ""; $("#newroom").classList.remove("show");
  await loadRooms();
  open("room", body.name);
};

const grow = () => { const t = $("#text"); t.style.height = "38px"; t.style.height = Math.min(t.scrollHeight, 160) + "px"; };
$("#text").oninput = grow;
$("#send").onsubmit = (e) => {
  e.preventDefault();
  const text = $("#text").value.trim();
  if (!text || !ws || ws.readyState !== 1) return;
  ws.send(JSON.stringify({ type: "msg", text }));
  $("#text").value = ""; grow();
};
$("#text").onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#send").requestSubmit(); } };
// sock is the connection the action started in; if the user switched chats since, don't send.
function sendMedia(media, sock = ws) {
  if (!sock || sock !== ws || sock.readyState !== 1) return false;
  sock.send(JSON.stringify({ type: "msg", text: "", media }));
  return true;
}

// ---- GIFs (Klipy, proxied through /api/gifs) ----
let gifTimer;
async function loadGifs(q) {
  const grid = $("#gifgrid");
  grid.replaceChildren(loader(LOADER_WORDS.gif, true));
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
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { $("#gifpanel").hidden = true; document.body.classList.remove("nav"); } });

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
  const startedIn = ws;
  try {
    const before = (file.size / 1048576).toFixed(1);
    const out = await compressVideo(file, (p, attempt) => busyNote("Compressing video" + (attempt ? " (pass " + (attempt + 1) + ")" : "") + "… " + Math.round(p * 100) + "% — keep this tab open"));
    busyNote("Uploading " + (out.blob.size / 1048576).toFixed(2) + " MB (was " + before + " MB)…");
    const res = await fetch("/api/media", { method: "POST", headers: { "Content-Type": out.blob.type }, body: out.blob });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Upload failed.");
    if (!sendMedia({ kind: "video", key: body.key, w: out.w, h: out.h, size: body.size }, startedIn)) {
      throw new Error("Video not sent: you switched chats or got disconnected while it was processing.");
    }
    note("");
  } catch (err) {
    note(err.message);
  } finally {
    $("#vidbtn").disabled = false;
  }
};


// ---- Plans (coming soon) ----
// From Uiverse.io by chase2k25 - https://uiverse.io/chase2k25/slimy-chipmunk-97
// MIT License, Copyright (c) chase2k25 (chandu.exe)
// Placeholder perks; nothing here is for sale yet.
const PLAN_PERKS = {
  silver: ["Videos up to 5 MB", "Silver badge next to your name", "Pick your avatar color"],
  gold: ["Videos up to 10 MB", "Messages can last up to 48 hours", "Gold badge next to your name", "Create private rooms"],
  platinum: ["Videos up to 25 MB", "Messages can last up to 7 days", "Platinum badge next to your name", "Private rooms and early access to new features"],
};
function showPerks() {
  const plan = document.querySelector('input[name="dc-plan"]:checked').value;
  $("#planperks").replaceChildren(...PLAN_PERKS[plan].map((t) => el("li", "", t)));
}
document.querySelectorAll('input[name="dc-plan"]').forEach((r) => (r.onchange = showPerks));
showPerks();
$("#plansbtn").onclick = () => $("#plans").showModal();
$("#plansclose").onclick = () => $("#plans").close();
$("#plans").onclick = (e) => { if (e.target === $("#plans")) $("#plans").close(); };

// ---- Admin panel: verify members and set roles ----
let adminRows = [];
function adminRow(u) {
  const row = el("div", "urow");
  const who = el("div", "who"); const line = el("div"); line.append(el("span", "", u.name), badges(u));
  who.append(line, el("small", "", u.email + " · joined " + new Date(u.joined.replace(" ", "T") + "Z").toLocaleDateString()));
  const sw = el("label", "switch"); const cb = el("input"); cb.type = "checkbox"; cb.checked = u.verified; cb.setAttribute("aria-label", "Verified: " + u.name);
  sw.append(cb, document.createTextNode("Verified"));
  const role = el("select"); role.setAttribute("aria-label", "Role for " + u.name);
  for (const r of ["user", "mod", "admin"]) { const o = el("option", "", r === "user" ? "Member" : r === "mod" ? "Mod" : "Admin"); o.value = r; o.selected = u.role === r; role.append(o); }
  if (u.id === me.id) role.disabled = true;
  const save = async (patch) => {
    const res = await fetch("/api/admin/users/" + u.id, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const body = await res.json().catch(() => ({ error: "Couldn't save." }));
    if (!res.ok) { toast(body.error); cb.checked = u.verified; role.value = u.role; return; }
    Object.assign(u, body);
    row.replaceWith(adminRow(u));
    toast(u.name + " updated");
    loadUsers();
  };
  cb.onchange = () => save({ verified: cb.checked });
  role.onchange = () => save({ role: role.value });
  row.append(avatar(u.name), who, sw, role);
  return row;
}
function drawAdmin() {
  const q = $("#adminq").value.trim().toLowerCase();
  const rows = adminRows.filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  $("#adminlist").replaceChildren(...(rows.length ? rows.map(adminRow) : [el("div", "empty-small", "No members match.")]));
}
$("#adminbtn").onclick = async () => {
  $("#admin").showModal();
  $("#adminlist").replaceChildren(el("div", "empty-small", "Loading…"));
  const res = await fetch("/api/admin/users");
  if (!res.ok) { $("#adminlist").replaceChildren(el("div", "empty-small", "Admins only.")); return; }
  adminRows = await res.json(); drawAdmin();
};
$("#adminq").oninput = drawAdmin;
$("#adminclose").onclick = () => $("#admin").close();
$("#admin").onclick = (e) => { if (e.target === $("#admin")) $("#admin").close(); };

$("#menu").onclick = () => document.body.classList.toggle("nav");
$("main").addEventListener("click", (e) => { if (document.body.classList.contains("nav") && !e.target.closest("#menu")) document.body.classList.remove("nav"); });

(async () => {
  try {
    me = await (await fetch("/api/me")).json();
    await loadUsers();
    const rooms = await loadRooms();
    if (rooms.includes("general")) open("room", "general");
    setInterval(loadUsers, 60000);
  } catch {
    toast("Couldn't load DarkChat. Try refreshing.");
  } finally {
    boot.classList.add("done");
    setTimeout(() => boot.remove(), 400);
  }
})();
</script>
</body>
</html>`;
