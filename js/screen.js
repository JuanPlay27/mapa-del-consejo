// Pantalla del proyector: muestra el mapa en vivo. Si la URL trae ?clave=<HOST_KEY>,
// también es el "anfitrión": inicia, termina y reinicia la partida.

import { BRANCHES, TILES } from "./content.js";
import { GAME_DURATION_SEC, HOST_KEY } from "./config.js";
import { createBackend } from "./backend.js";
import { createGame } from "./game.js";
import { createBotSquad } from "./bots.js";
import { countOnline, countPlaced, formatClock, groupByBranch, remainingMs } from "./logic.js";
import { confetti, createSounds, el, novaSvg, show } from "./ui.js";
import qrcode from "./vendor/qrcode.mjs";

const LEFT_BRANCHES = ["def", "res", "mod"];
const URGENT_MS = 30_000;
const RESET_CONFIRM_MS = 3000;

const params = new URLSearchParams(location.search);
const isHost = params.get("clave") === HOST_KEY;
const $ = (id) => document.getElementById(id);
const branchById = Object.fromEntries(BRANCHES.map((b) => [b.id, b]));
const tileById = Object.fromEntries(TILES.map((t) => [t.id, t]));
const sounds = createSounds();

const snapshot = { state: null, tiles: {}, players: {}, stats: {} };
const branchEls = {};
const lobbyNameEls = new Map();
let backend;
let game;
let bots;
let lastPlaced = null;
let finishingRound = null;
let endShownFor = null;
let forceQr = false;
let resetArmedAt = 0;
let hostPanelPhase = null;

init().catch(showFatal);

async function init() {
  backend = await createBackend();
  game = createGame(backend);
  bots = createBotSquad(game, () => snapshot);

  buildBranches();
  renderQr();
  $("coreNova").innerHTML = novaSvg("happy", "bob");
  show($("modePill"), backend.mode === "demo");
  if (isHost) setupHost();

  backend.listen(game.path("state"), (v) => { snapshot.state = v; render(); });
  backend.listen(game.path("tiles"), (v) => { snapshot.tiles = v || {}; render(); });
  backend.listen(game.path("players"), (v) => { snapshot.players = v || {}; render(); });
  backend.listen(game.path("stats"), (v) => { snapshot.stats = v || {}; });
  backend.listenLast(game.path("events"), 5, renderFeed);
  backend.onConnection((connected) => show($("connPill"), !connected));

  setInterval(tickClock, 250);
  new ResizeObserver(drawLinks).observe($("map"));
  document.fonts?.ready.then(drawLinks);
}

// ------------------------------------------------------------------ construcción
function buildBranches() {
  for (const branch of BRANCHES) {
    const count = el("span", { className: "s-branch-count", text: "0/0" });
    const placedWrap = el("span", { style: { display: "contents" } });
    const slotWrap = el("span", { style: { display: "contents" } });
    const box = el("article", { className: "s-branch", attrs: { "aria-label": branch.name } }, [
      el("div", { className: "s-branch-head" }, [
        el("span", { className: "s-branch-dot" }),
        el("div", {}, [el("div", { className: "s-branch-name", text: branch.name }), el("div", { className: "s-branch-sub", text: branch.hint })]),
        count,
      ]),
      el("div", { className: "s-chips" }, [placedWrap, slotWrap]),
    ]);
    // Cada rama ocupa alto según cuántas fichas lleva, para que ninguna se corte.
    box.style.flex = String(2 + TILES.filter((t) => t.branches[0] === branch.id).length);
    box.style.setProperty("--c", branch.color);
    box.style.setProperty("--t", branch.tint);
    $(LEFT_BRANCHES.includes(branch.id) ? "colLeft" : "colRight").append(box);
    branchEls[branch.id] = { box, count, placedWrap, slotWrap, chips: new Map() };
  }
}

function joinUrl() {
  const url = new URL("./", location.href);
  if (backend.mode === "demo") url.search = "?demo";
  return url;
}

function renderQr() {
  const url = joinUrl();
  const qr = qrcode(0, "M");
  qr.addData(url.href);
  qr.make();
  $("qr").innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true, alt: "Código QR para unirse" });
  $("joinUrl").textContent = `${url.host}${url.pathname}${url.search}`;
}

// ------------------------------------------------------------------ render
function phase() {
  return snapshot.state?.phase || "lobby";
}

function render() {
  const placed = countPlaced(snapshot.tiles);
  const total = TILES.length;
  const online = countOnline(snapshot.players);

  show($("lobby"), phase() === "lobby" || forceQr);
  renderLobbyNames();
  $("lobbyCount").textContent = String(online);
  $("playersPill").textContent = `${online} conectados`;
  $("progressPill").textContent = `${placed} / ${total}`;
  $("progressText").textContent = `${placed} de ${total} fichas en el mapa`;
  $("barFill").style.width = `${(placed / total) * 100}%`;
  $("coreNova").style.filter = `grayscale(${1 - placed / total}) brightness(${0.75 + 0.25 * (placed / total)})`;

  renderBranches();
  // Fuera de la sala de espera el panel del anfitrión se encoge para no tapar el mapa.
  if (isHost && hostPanelPhase !== phase()) {
    hostPanelPhase = phase();
    $("host").classList.toggle("collapsed", phase() !== "lobby");
  }

  if (lastPlaced !== null && placed > lastPlaced) sounds.pop();
  lastPlaced = placed;

  if (isHost && phase() === "playing" && placed === total) finishOnce("complete");
  renderEnd(placed, total);
}

function renderBranches() {
  const groups = groupByBranch(snapshot.tiles, TILES, BRANCHES);
  const reveal = phase() === "done";
  for (const branch of BRANCHES) {
    const refs = branchEls[branch.id];
    const group = groups[branch.id];
    const placedIds = new Set(group.placed.map((p) => p.tile.id));

    // Solo se agregan las fichas nuevas, para que la animación no se repita en las viejas.
    for (const [tileId, node] of refs.chips) {
      if (!placedIds.has(tileId)) { node.remove(); refs.chips.delete(tileId); }
    }
    for (const { tile, record } of group.placed) {
      if (refs.chips.has(tile.id)) continue;
      const chip = el("span", { className: "s-chip" }, [document.createTextNode(tile.text), el("small", { text: record.placedBy || "" })]);
      refs.placedWrap.append(chip);
      refs.chips.set(tile.id, chip);
    }

    refs.slotWrap.replaceChildren(...pendingChips(branch.id, group.pending, reveal));
    refs.count.textContent = `${group.placed.length}/${group.placed.length + group.pending}`;
    refs.box.classList.toggle("full", group.pending === 0);
  }
}

/** Huecos con "?"; al terminar, muestran qué fichas faltaron (sirve para repasar). */
function pendingChips(branchId, pending, reveal) {
  if (!reveal) return Array.from({ length: pending }, () => el("span", { className: "s-chip slot", text: "?" }));
  return TILES
    .filter((t) => t.branches[0] === branchId && !snapshot.tiles?.[t.id]?.branch)
    .map((t) => el("span", { className: "s-chip missing", text: t.text }));
}

function renderLobbyNames() {
  const online = Object.entries(snapshot.players).filter(([, p]) => p?.online && p.name);
  const onlineIds = new Set(online.map(([uid]) => uid));
  for (const [uid, node] of lobbyNameEls) {
    if (!onlineIds.has(uid)) { node.remove(); lobbyNameEls.delete(uid); }
  }
  for (const [uid, player] of online) {
    if (lobbyNameEls.has(uid)) continue;
    const chip = el("span", { text: player.name });
    $("lobbyNames").append(chip);
    lobbyNameEls.set(uid, chip);
  }
}

function renderFeed(rows) {
  const items = rows.slice().reverse().map(([, ev]) => {
    const tile = tileById[ev.tileId];
    const text = ev.type === "passed"
      ? ` pasó «${tile?.text ?? "?"}» al consejo`
      : ` puso «${tile?.text ?? "?"}» en ${branchById[ev.branch]?.name ?? "?"}`;
    return el("li", {}, [el("b", { text: ev.name || "Alguien" }), document.createTextNode(text)]);
  });
  $("feed").replaceChildren(...items);
}

function renderEnd(placed, total) {
  const state = snapshot.state;
  if (phase() !== "done") { show($("end"), false); endShownFor = null; return; }
  if (endShownFor === state.endedAt) return;
  endShownFor = state.endedAt;

  const complete = placed === total;
  const helpers = Object.values(snapshot.players).filter((p) => (p?.placed || 0) > 0).length;
  const elapsed = (state.endedAt || 0) - (state.startedAt || 0);
  const title = complete ? "¡Mapa completo!" : state.reason === "time" ? "¡Se acabó el tiempo!" : "Partida terminada";
  const subtitle = complete
    ? "El consejo gobernó la TI en equipo. Nova está feliz."
    : "Las fichas que faltaron aparecen en gris en el mapa: repasémoslas juntos.";

  const card = el("div", { className: `s-end-card${complete ? "" : " partial"}` });
  const nova = el("div", { className: "s-end-nova" });
  nova.innerHTML = novaSvg(complete ? "happy" : "worried", "bob");
  const seeMap = el("button", { className: "btn ghost", text: "Ver el mapa", style: { background: "#ede9fe", color: "#101040" } });
  seeMap.onclick = () => show($("end"), false);
  const actions = el("div", { className: "s-end-actions" }, [seeMap]);
  if (isHost) {
    const again = el("button", { className: "btn", text: "Jugar otra vez" });
    again.onclick = () => game.resetGame(snapshot.players);
    actions.append(again);
  }
  card.append(
    nova,
    el("h2", { text: title }),
    el("p", { className: "s-branch-sub", text: subtitle, style: { fontSize: "1.4em" } }),
    el("div", { className: "s-end-stats" }, [
      stat(`${placed}/${total}`, "fichas colocadas"),
      stat(formatClock(Math.max(0, elapsed)), "tiempo"),
      stat(String(helpers), "personas aportaron"),
      stat(String(snapshot.stats?.mistakes || 0), "errores corregidos"),
    ]),
    actions,
  );
  $("end").replaceChildren(card);
  show($("end"), true);
  if (complete) { confetti(140); sounds.win(); }
}

function stat(value, label) {
  return el("div", {}, [el("b", { text: value }), document.createTextNode(label)]);
}

function tickClock() {
  const state = snapshot.state;
  const pill = $("timerPill");
  if (phase() !== "playing") {
    pill.textContent = phase() === "lobby" ? formatClock(GAME_DURATION_SEC * 1000) : "0:00";
    pill.classList.remove("hot");
    return;
  }
  const left = remainingMs(state, backend.serverNow());
  pill.textContent = formatClock(left);
  pill.classList.toggle("hot", left <= URGENT_MS);
  if (isHost && left === 0) finishOnce("time");
}

function finishOnce(reason) {
  const round = snapshot.state?.startedAt;
  if (finishingRound === round) return;
  finishingRound = round;
  game.finishGame(reason);
}

// ------------------------------------------------------------------ líneas del mapa
function drawLinks() {
  const svg = $("links");
  const mapRect = $("map").getBoundingClientRect();
  const core = $("coreTitle").getBoundingClientRect();
  const cx = core.left + core.width / 2 - mapRect.left;
  const cy = core.top + core.height / 2 - mapRect.top;
  svg.setAttribute("viewBox", `0 0 ${mapRect.width} ${mapRect.height}`);
  const paths = BRANCHES.map((branch) => {
    const box = branchEls[branch.id].box.getBoundingClientRect();
    const isLeft = LEFT_BRANCHES.includes(branch.id);
    const ex = (isLeft ? box.right : box.left) - mapRect.left;
    const ey = box.top + box.height / 2 - mapRect.top;
    const sx = cx + (isLeft ? -core.width / 2 : core.width / 2);
    const mx = (sx + ex) / 2;
    return `<path d="M${sx} ${cy} C${mx} ${cy}, ${mx} ${ey}, ${ex} ${ey}" fill="none" stroke="${branch.color}" stroke-width="8" stroke-linecap="round" opacity=".9"/>`;
  });
  svg.innerHTML = paths.join("");
}

// ------------------------------------------------------------------ anfitrión
function setupHost() {
  show($("host"), true);
  const actions = {
    e: () => { sounds.unlock(); forceQr = false; return game.startGame(GAME_DURATION_SEC, snapshot.players); },
    t: () => phase() === "playing" && finishOnce("host"),
    q: () => { forceQr = !forceQr; render(); },
    l: async () => toast(`Fichas liberadas: ${await game.releaseStuckTiles(snapshot.tiles, snapshot.players)}`),
    r: () => {
      if (Date.now() - resetArmedAt > RESET_CONFIRM_MS) {
        resetArmedAt = Date.now();
        toast("Pulsa Reiniciar otra vez para confirmar");
        return;
      }
      resetArmedAt = 0;
      bots.stop();
      return game.resetGame(snapshot.players);
    },
    b: async () => { await bots.add(5); toast("5 bots de ensayo conectados (quítalos antes de la clase)"); },
    m: () => toast(sounds.toggle() ? "Sonido apagado" : "Sonido encendido"),
    h: () => $("host").classList.toggle("collapsed"),
    f: () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()),
  };
  const buttons = { hToggle: "h", hStart: "e", hFinish: "t", hQr: "q", hRelease: "l", hReset: "r", hBots: "b", hMute: "m", hFull: "f" };
  for (const [id, key] of Object.entries(buttons)) $(id).onclick = () => runAction(actions[key]);
  $("hNoBots").onclick = () => runAction(async () => { bots.stop(); await game.removeBots(snapshot.players, snapshot.tiles); toast("Bots eliminados"); });
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const action = actions[e.key.toLowerCase()];
    if (action) { e.preventDefault(); runAction(action); }
  });
}

async function runAction(action) {
  try { await action(); } catch (err) { toast(`Error: ${err.message}`); }
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
  document.body.classList.remove("screen");
  document.body.replaceChildren(
    el("div", { className: "fatal" }, [
      el("h2", { text: "No se pudo conectar" }),
      el("p", { text: err.message }),
      el("p", { text: "Revisen js/config.js y la sección «Si algo falla» del README. Para ensayar sin Firebase, agreguen ?demo a la dirección." }),
    ]),
  );
}
