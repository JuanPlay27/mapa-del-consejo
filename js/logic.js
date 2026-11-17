// Reglas puras del juego: sin red ni DOM, para poder probarlas con `node --test`.

export const MAX_NAME_LENGTH = 16;

export function isTileFree(record) {
  return !record || (!record.owner && !record.branch);
}

export function isTilePlaced(record) {
  return Boolean(record && record.branch);
}

export function countPlaced(tilesState) {
  return Object.values(tilesState || {}).filter(isTilePlaced).length;
}

export function isCorrectBranch(tile, branchId) {
  return tile.branches.includes(branchId);
}

/** Fichas libres; las que el jugador ya pasó se evitan, salvo que no quede otra. */
export function freeTileIds(tilesState, allTiles, excludedIds = new Set()) {
  const free = allTiles.map((t) => t.id).filter((id) => isTileFree(tilesState?.[id]));
  const preferred = free.filter((id) => !excludedIds.has(id));
  return preferred.length > 0 ? preferred : free;
}

/** La ficha que el jugador tiene en la mano (asignada y sin colocar), o null. */
export function tileHeldBy(tilesState, uid) {
  const entry = Object.entries(tilesState || {}).find(
    ([, record]) => record && record.owner === uid && !record.branch,
  );
  return entry ? entry[0] : null;
}

/** Fichas en la mano de jugadores desconectados: el anfitrión puede liberarlas. */
export function stuckTileIds(tilesState, players) {
  return Object.entries(tilesState || {})
    .filter(([, r]) => r && r.owner && !r.branch && !(players?.[r.owner]?.online))
    .map(([id]) => id);
}

/** Agrupa por rama: fichas colocadas allí y cuántas siguen pendientes de esa rama. */
export function groupByBranch(tilesState, allTiles, branches) {
  const groups = Object.fromEntries(branches.map((b) => [b.id, { placed: [], pending: 0 }]));
  for (const tile of allTiles) {
    const record = tilesState?.[tile.id];
    if (isTilePlaced(record) && groups[record.branch]) {
      groups[record.branch].placed.push({ tile, record });
    } else {
      groups[tile.branches[0]].pending += 1;
    }
  }
  for (const g of Object.values(groups)) {
    g.placed.sort((a, b) => (a.record.placedAt || 0) - (b.record.placedAt || 0));
  }
  return groups;
}

export function sanitizeName(raw) {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

export function remainingMs(state, nowMs) {
  if (!state || !state.startedAt || !state.durationSec) return 0;
  return Math.max(0, state.startedAt + state.durationSec * 1000 - nowMs);
}

export function formatClock(ms) {
  const totalSec = Math.ceil(Math.max(0, ms) / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = String(totalSec % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function countOnline(players) {
  return Object.values(players || {}).filter((p) => p && p.online).length;
}
