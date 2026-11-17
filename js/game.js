// Operaciones del juego sobre la base de datos. Los cambios que pueden chocar
// (dos personas reclamando la misma ficha) van en transacciones: Firebase garantiza
// que solo una gana, y la otra simplemente intenta con otra ficha.

import { TILES } from "./content.js";
import { DB_ROOT } from "./config.js";
import { freeTileIds, isCorrectBranch, isTileFree, shuffle, stuckTileIds } from "./logic.js";

const MAX_CLAIM_ATTEMPTS = 6;

export function createGame(backend, root = DB_ROOT) {
  const path = (sub) => `${root}/${sub}`;
  const tileGuards = new Map();

  // Si el celular se apaga o pierde la señal con una ficha en la mano, Firebase la libera sola.
  async function guardTile(tileId) {
    tileGuards.set(tileId, await backend.onDisconnectSet(path(`tiles/${tileId}/owner`), null));
  }

  async function releaseGuard(tileId) {
    const guard = tileGuards.get(tileId);
    if (!guard) return;
    tileGuards.delete(tileId);
    await guard.cancel();
  }

  const event = (data) => backend.push(path("events"), { ...data, at: backend.serverNow() });
  const increment = (sub) => backend.transaction(path(sub), (n) => (n || 0) + 1);

  return {
    path,

    async joinPlayer(uid, name, { isBot = false } = {}) {
      await backend.update(path(`players/${uid}`), { name, online: true, bot: isBot, seenAt: backend.serverNow() });
      await backend.onDisconnectSet(path(`players/${uid}/online`), false);
    },

    /** Reclama una ficha libre al azar. Devuelve su id, o null si no quedan libres. */
    async claimTile(uid, name, tilesState, excludedIds) {
      const candidates = shuffle(freeTileIds(tilesState, TILES, excludedIds)).slice(0, MAX_CLAIM_ATTEMPTS);
      for (const tileId of candidates) {
        const result = await backend.transaction(path(`tiles/${tileId}`), (current) => {
          if (!isTileFree(current)) return undefined;
          return { owner: uid, ownerName: name, claimedAt: backend.serverNow() };
        });
        if (result.committed) {
          await guardTile(tileId);
          return tileId;
        }
      }
      return null;
    },

    /** Intenta colocar la ficha. reason: "wrong" (rama incorrecta) o "lost" (ya no es suya). */
    async placeTile(uid, name, tileId, branchId) {
      const tile = TILES.find((t) => t.id === tileId);
      if (!tile) return { ok: false, reason: "lost" };
      if (!isCorrectBranch(tile, branchId)) {
        await increment("stats/mistakes");
        return { ok: false, reason: "wrong" };
      }
      const result = await backend.transaction(path(`tiles/${tileId}`), (current) => {
        if (!current || current.owner !== uid || current.branch) return undefined;
        return { ...current, branch: branchId, placedBy: name, placedAt: backend.serverNow() };
      });
      if (!result.committed) return { ok: false, reason: "lost" };
      await releaseGuard(tileId);
      await Promise.all([
        event({ type: "placed", name, tileId, branch: branchId }),
        increment(`players/${uid}/placed`),
      ]);
      return { ok: true };
    },

    /** Devuelve la ficha al consejo para que le llegue a otra persona. */
    async passTile(uid, name, tileId) {
      const result = await backend.transaction(path(`tiles/${tileId}`), (current) => {
        if (!current || current.owner !== uid || current.branch) return undefined;
        return { passedBy: name };
      });
      if (!result.committed) return false;
      await releaseGuard(tileId);
      await event({ type: "passed", name, tileId });
      return true;
    },

    // ------------------------------------------------ acciones del anfitrión
    async startGame(durationSec, players) {
      await backend.update(root, {
        ...resetPlayerCounters(players),
        tiles: null,
        events: null,
        stats: null,
        state: { phase: "playing", startedAt: backend.serverNow(), durationSec },
      });
    },

    finishGame(reason) {
      return backend.update(path("state"), { phase: "done", reason, endedAt: backend.serverNow() });
    },

    async resetGame(players) {
      // Firebase rechaza un update que toque a la vez una ruta y su hija, por eso
      // los contadores solo se limpian a quienes se quedan.
      const entries = Object.entries(players || {});
      const offline = entries.filter(([, p]) => !p?.online);
      const staying = Object.fromEntries(entries.filter(([, p]) => p?.online));
      await backend.update(root, {
        ...resetPlayerCounters(staying),
        ...Object.fromEntries(offline.map(([uid]) => [`players/${uid}`, null])),
        tiles: null,
        events: null,
        stats: null,
        state: { phase: "lobby" },
      });
    },

    async releaseStuckTiles(tilesState, players) {
      const ids = stuckTileIds(tilesState, players);
      if (ids.length === 0) return 0;
      await backend.update(path("tiles"), Object.fromEntries(ids.map((id) => [`${id}/owner`, null])));
      return ids.length;
    },

    async removeBots(players, tilesState) {
      const botIds = Object.entries(players || {}).filter(([, p]) => p?.bot).map(([uid]) => uid);
      const heldByBots = Object.entries(tilesState || {})
        .filter(([, r]) => r && botIds.includes(r.owner) && !r.branch)
        .map(([id]) => [`tiles/${id}/owner`, null]);
      if (botIds.length === 0) return;
      await backend.update(root, {
        ...Object.fromEntries(botIds.map((uid) => [`players/${uid}`, null])),
        ...Object.fromEntries(heldByBots),
      });
    },
  };
}

function resetPlayerCounters(players) {
  return Object.fromEntries(Object.keys(players || {}).map((uid) => [`players/${uid}/placed`, null]));
}
