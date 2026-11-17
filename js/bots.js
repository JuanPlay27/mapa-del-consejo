// Jugadores simulados para ENSAYAR (no los usen en la clase: se quedarían con fichas).
// Corren dentro de la pantalla del anfitrión y usan exactamente las mismas operaciones
// que un celular, así que sirven para probar Firebase con 20-30 "personas".

import { BRANCHES, TILES } from "./content.js";
import { tileHeldBy } from "./logic.js";

const BOT_ACCURACY = 0.75;
const MIN_DELAY_MS = 1500;
const MAX_DELAY_MS = 4500;

export function createBotSquad(game, getSnapshot) {
  const timers = new Set();
  let created = 0;

  function schedule(fn) {
    const timer = setTimeout(() => { timers.delete(timer); fn(); }, MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
    timers.add(timer);
  }

  function chooseBranch(tile) {
    if (Math.random() < BOT_ACCURACY) return tile.branches[0];
    const wrong = BRANCHES.filter((b) => !tile.branches.includes(b.id));
    return wrong[Math.floor(Math.random() * wrong.length)].id;
  }

  async function tick(uid, name) {
    const { state, tiles } = getSnapshot();
    if (state?.phase === "playing") {
      const held = tileHeldBy(tiles, uid);
      if (!held) {
        await game.claimTile(uid, name, tiles, new Set());
      } else {
        const tile = TILES.find((t) => t.id === held);
        await game.placeTile(uid, name, held, chooseBranch(tile));
      }
    }
    schedule(() => tick(uid, name));
  }

  return {
    async add(count) {
      for (let i = 0; i < count; i += 1) {
        created += 1;
        const uid = `bot-${created}-${Math.random().toString(36).slice(2, 7)}`;
        const name = `Bot ${created}`;
        await game.joinPlayer(uid, name, { isBot: true });
        schedule(() => tick(uid, name));
      }
    },
    stop() {
      for (const t of timers) clearTimeout(t);
      timers.clear();
    },
  };
}
