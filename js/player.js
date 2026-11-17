// Vista del celular. Todo lo que ve el jugador se deriva de la base de datos:
// "mi ficha" es la que tiene mi uid como dueño, así que recargar la página no la pierde.

import { BRANCHES, TILES } from "./content.js";
import { GAME_DURATION_SEC } from "./config.js";
import { createBackend, wantsDemo } from "./backend.js";
import { createGame } from "./game.js";
import { countOnline, countPlaced, formatClock, freeTileIds, remainingMs, sanitizeName, tileHeldBy } from "./logic.js";
import { confetti, el, novaSvg, show, vibrate } from "./ui.js";

const STORAGE_UID = "mapa-uid";
const STORAGE_NAME = "mapa-name";
const FLASH_MS = 1100;
const MAX_WAIT_LIST = 6;
const NUDGE_AFTER_MISTAKES = 2;

// En modo ensayo cada pestaña es un jugador distinto (sessionStorage); en vivo, el
// celular recuerda quién es aunque recargue la página (localStorage).
const store = wantsDemo() ? sessionStorage : localStorage;
const $ = (id) => document.getElementById(id);
const tileById = Object.fromEntries(TILES.map((t) => [t.id, t]));
const views = ["vLoading", "vJoin", "vLobby", "vPlay", "vWait", "vDone"];

const uid = loadUid();
const snapshot = { state: null, tiles: {}, players: {} };
const local = {
  name: store.getItem(STORAGE_NAME) || "",
  connected: true,
  claiming: false,
  busy: false,
  flashUntil: 0,
  round: null,
  excluded: new Set(),
  shownTile: null,
  wrong: new Set(),
};
let backend;
let game;

init().catch(showFatal);

function loadUid() {
  let id = store.getItem(STORAGE_UID);
  if (!id) {
    const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    id = `p-${random.replace(/-/g, "").slice(0, 14)}`;
    store.setItem(STORAGE_UID, id);
  }
  return id;
}

async function init() {
  for (const id of ["novaLoading", "novaJoin", "novaLobby", "novaWait", "novaDone"]) $(id).innerHTML = novaSvg("happy");
  buildBranchButtons();
  $("joinForm").addEventListener("submit", onJoin);
  $("changeName").onclick = () => { local.name = ""; store.removeItem(STORAGE_NAME); render(); };
  $("passBtn").onclick = onPass;

  backend = await createBackend();
  game = createGame(backend);

  backend.listen(game.path("state"), (v) => { snapshot.state = v; render(); });
  backend.listen(game.path("tiles"), (v) => { snapshot.tiles = v || {}; render(); });
  backend.listen(game.path("players"), (v) => { snapshot.players = v || {}; render(); });
  // Cada vez que vuelve la conexión, el jugador se registra de nuevo como "en línea".
  backend.onConnection((connected) => {
    local.connected = connected;
    if (connected && local.name) game.joinPlayer(uid, local.name).catch(() => {});
    render();
  });
  setInterval(tickClock, 500);
  render();
}

function buildBranchButtons() {
  const buttons = BRANCHES.map((branch) => {
    const btn = el("button", { className: "branch-btn", attrs: { type: "button", "data-branch": branch.id } }, [
      el("b", { text: branch.name }),
      el("small", { text: branch.hint }),
    ]);
    btn.style.setProperty("--c", branch.color);
    btn.onclick = () => onBranch(branch.id);
    return btn;
  });
  $("branchButtons").replaceChildren(...buttons);
}

// ------------------------------------------------------------------ acciones
async function onJoin(event) {
  event.preventDefault();
  const name = sanitizeName($("nameInput").value);
  if (!name) { shake($("nameInput")); return; }
  local.name = name;
  store.setItem(STORAGE_NAME, name);
  render();
  try { await game.joinPlayer(uid, name); } catch (err) { toast(`No se pudo entrar: ${err.message}`); }
}

async function onBranch(branchId) {
  const tileId = tileHeldBy(snapshot.tiles, uid);
  if (!tileId || local.busy) return;
  local.busy = true;
  setButtonsDisabled(true);
  try {
    const result = await game.placeTile(uid, local.name, tileId, branchId);
    if (result.ok) {
      vibrate(70);
      confetti(24);
      flash("¡Al mapa! 🎉");
    } else if (result.reason === "wrong") {
      local.wrong.add(branchId);
      vibrate([90, 60, 90]);
      shake($("tileCard"));
      $("hintText").textContent = tileById[tileId].clue;
      show($("hint"), true);
    } else {
      toast("Esa ficha pasó a otro consejero. ¡Ya te llega otra!");
    }
  } catch (err) {
    toast(`Error de conexión: ${err.message}`);
  } finally {
    local.busy = false;
    render();
  }
}

async function onPass() {
  const tileId = tileHeldBy(snapshot.tiles, uid);
  if (!tileId || local.busy) return;
  local.busy = true;
  try {
    if (await game.passTile(uid, local.name, tileId)) {
      local.excluded.add(tileId);
      toast("Le pasaste la ficha al consejo. Aquí va otra.");
    }
  } finally {
    local.busy = false;
    render();
  }
}

/** Pide una ficha cuando no tengo ninguna. Si otro gana la carrera, reintenta pronto. */
async function maybeClaim() {
  if (local.claiming || local.busy || !local.connected || Date.now() < local.flashUntil) return;
  if (freeTileIds(snapshot.tiles, TILES).length === 0) return;
  local.claiming = true;
  try {
    const got = await game.claimTile(uid, local.name, snapshot.tiles, local.excluded);
    if (!got) setTimeout(render, 300 + Math.random() * 500);
  } catch {
    setTimeout(render, 1000);
  } finally {
    local.claiming = false;
  }
}

// ------------------------------------------------------------------ render
function phase() {
  return snapshot.state?.phase || "lobby";
}

function render() {
  if (!backend) return showView("vLoading");
  syncRound();
  show($("top"), Boolean(local.name));
  $("meName").textContent = local.name;
  $("pProgress").textContent = `${countPlaced(snapshot.tiles)}/${TILES.length}`;
  $("conn").classList.toggle("off", !local.connected);
  $("connText").textContent = local.connected ? "En línea" : "Reconectando…";

  if (!local.name) return showView("vJoin");
  if (phase() === "lobby") return renderLobby();
  if (phase() === "done") return renderDone();

  const held = tileHeldBy(snapshot.tiles, uid);
  if (held) return renderPlay(held);
  renderWait();
  maybeClaim();
}

/** Al empezar una partida nueva se olvida lo de la anterior. */
function syncRound() {
  const round = snapshot.state?.startedAt ?? null;
  if (round === local.round) return;
  local.round = round;
  local.excluded.clear();
  local.shownTile = null;
}

function renderLobby() {
  $("lobbyTitle").textContent = `¡Listo, ${local.name}!`;
  $("lobbyCount").textContent = String(countOnline(snapshot.players));
  showView("vLobby");
}

function renderPlay(tileId) {
  if (local.shownTile !== tileId) {
    local.shownTile = tileId;
    local.wrong.clear();
    show($("hint"), false);
    $("tileText").textContent = tileById[tileId].text;
  }
  setButtonsDisabled(local.busy || !local.connected);
  $("passBtn").classList.toggle("nudge", local.wrong.size >= NUDGE_AFTER_MISTAKES);
  showView("vPlay");
}

function renderWait() {
  const anyFree = freeTileIds(snapshot.tiles, TILES).length > 0;
  $("waitTitle").textContent = anyFree ? "Buscando una ficha para ti…" : "¡Todas las fichas tienen dueño!";
  $("waitText").textContent = anyFree
    ? "Un segundo…"
    : "Ayuda en voz alta a quienes todavía tienen ficha. Si alguien pasa la suya, te llega automáticamente.";
  const others = Object.entries(snapshot.tiles)
    .filter(([, r]) => r?.owner && r.owner !== uid && !r.branch)
    .slice(0, MAX_WAIT_LIST)
    .map(([id, r]) => el("li", {}, [el("b", { text: `«${tileById[id]?.text ?? "?"}»` }), document.createTextNode(` — la tiene ${r.ownerName || "alguien"}`)]));
  $("waitList").replaceChildren(...(anyFree ? [] : others));
  $("waitMine").textContent = `Llevas ${myPlaced()} ficha(s) en el mapa.`;
  showView("vWait");
}

function renderDone() {
  const placed = countPlaced(snapshot.tiles);
  const complete = placed === TILES.length;
  $("doneTitle").textContent = complete ? "¡Mapa completo! 🏆" : "¡Se acabó el tiempo!";
  $("doneText").textContent = `El consejo colocó ${placed} de ${TILES.length} fichas.`;
  $("doneMine").textContent = String(myPlaced());
  $("novaDone").innerHTML = novaSvg(complete ? "happy" : "worried");
  showView("vDone");
}

function tickClock() {
  const state = snapshot.state;
  const ms = phase() === "playing" && backend ? remainingMs(state, backend.serverNow()) : phase() === "lobby" ? GAME_DURATION_SEC * 1000 : 0;
  $("pTimer").textContent = formatClock(ms);
}

// ------------------------------------------------------------------ utilidades
const myPlaced = () => snapshot.players?.[uid]?.placed || 0;

function showView(id) {
  for (const v of views) show($(v), v === id);
}

function setButtonsDisabled(disabled) {
  for (const btn of $("branchButtons").children) {
    btn.disabled = disabled || local.wrong.has(btn.dataset.branch);
  }
}

function flash(message) {
  local.flashUntil = Date.now() + FLASH_MS;
  const node = el("div", { className: "p-flash", attrs: { role: "status" } }, [el("div", { text: message })]);
  document.body.append(node);
  setTimeout(() => { node.remove(); render(); }, FLASH_MS);
}

function shake(node) {
  node.classList.remove("shake");
  void node.offsetWidth;
  node.classList.add("shake");
}

let toastTimer;
function toast(message) {
  const node = $("toast");
  node.textContent = message;
  node.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("on"), 2600);
}

function showFatal(err) {
  showView("vLoading");
  document.querySelector("#vLoading .p-text").textContent = `No se pudo conectar: ${err.message}`;
}
