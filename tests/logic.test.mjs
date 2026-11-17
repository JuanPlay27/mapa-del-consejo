// Ejecutar con: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { BRANCHES, TILES } from "../js/content.js";
import {
  countOnline, countPlaced, formatClock, freeTileIds, groupByBranch, isCorrectBranch,
  isTileFree, remainingMs, sanitizeName, shuffle, stuckTileIds, tileHeldBy,
} from "../js/logic.js";

test("el contenido es consistente: ids únicos y ramas existentes", () => {
  const ids = TILES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  const branchIds = new Set(BRANCHES.map((b) => b.id));
  for (const tile of TILES) {
    assert.ok(tile.branches.length > 0, tile.id);
    for (const b of tile.branches) assert.ok(branchIds.has(b), `${tile.id} → ${b}`);
    assert.ok(tile.clue.length > 10, `${tile.id} sin pista`);
  }
  const texts = TILES.map((t) => t.text.toLowerCase());
  assert.equal(new Set(texts).size, texts.length, "dos fichas con el mismo texto confundirían");
});

test("hay suficientes fichas para 20-30 jugadores", () => {
  assert.ok(TILES.length >= 30);
});

test("una ficha está libre si nadie la tiene ni está colocada", () => {
  assert.equal(isTileFree(undefined), true);
  assert.equal(isTileFree({ passedBy: "Ana" }), true);
  assert.equal(isTileFree({ owner: "u1" }), false);
  assert.equal(isTileFree({ owner: null, branch: "mod" }), false);
});

test("freeTileIds evita las fichas que el jugador pasó, salvo que no quede otra", () => {
  const tiles = Object.fromEntries(TILES.slice(2).map((t) => [t.id, { owner: "x" }]));
  const [a, b] = TILES;
  assert.deepEqual(freeTileIds(tiles, TILES, new Set([a.id])), [b.id]);
  assert.deepEqual(freeTileIds(tiles, TILES, new Set([a.id, b.id])).sort(), [a.id, b.id].sort());
});

test("tileHeldBy solo devuelve fichas sin colocar del jugador", () => {
  const tiles = { t01: { owner: "u1", branch: "def" }, t02: { owner: "u1" }, t03: { owner: "u2" } };
  assert.equal(tileHeldBy(tiles, "u1"), "t02");
  assert.equal(tileHeldBy(tiles, "u9"), null);
  assert.equal(tileHeldBy(null, "u1"), null);
});

test("rendición de cuentas vale en Marco y en Principios", () => {
  const tile = TILES.find((t) => t.text === "Rendición de cuentas");
  assert.ok(isCorrectBranch(tile, "mar"));
  assert.ok(isCorrectBranch(tile, "pri"));
  assert.ok(!isCorrectBranch(tile, "mod"));
});

test("groupByBranch cuenta colocadas por rama y pendientes por rama oficial", () => {
  const tiles = { t27: { owner: "u1", branch: "pri", placedAt: 2 }, t14: { owner: "u2", branch: "pri", placedAt: 1 } };
  const groups = groupByBranch(tiles, TILES, BRANCHES);
  assert.deepEqual(groups.pri.placed.map((p) => p.tile.id), ["t14", "t27"]);
  const totalPending = Object.values(groups).reduce((n, g) => n + g.pending, 0);
  assert.equal(totalPending, TILES.length - 2);
  assert.equal(countPlaced(tiles), 2);
});

test("stuckTileIds detecta fichas en manos de jugadores desconectados", () => {
  const tiles = { t01: { owner: "u1" }, t02: { owner: "u2" }, t03: { owner: "u3", branch: "def" } };
  const players = { u1: { online: true }, u2: { online: false } };
  assert.deepEqual(stuckTileIds(tiles, players), ["t02"]);
});

test("sanitizeName limpia, recorta y bloquea HTML", () => {
  assert.equal(sanitizeName("  Laura   Caballero  "), "Laura Caballero");
  assert.equal(sanitizeName("<b>hack</b>"), "bhack/b");
  assert.equal(sanitizeName("Nombre larguísimo de verdad").length, 16);
  assert.equal(sanitizeName(null), "");
});

test("reloj: tiempo restante y formato", () => {
  const state = { startedAt: 1000, durationSec: 240 };
  assert.equal(remainingMs(state, 1000), 240_000);
  assert.equal(remainingMs(state, 1000 + 300_000), 0);
  assert.equal(remainingMs(null, 5), 0);
  assert.equal(formatClock(240_000), "4:00");
  assert.equal(formatClock(61_500), "1:02");
  assert.equal(formatClock(-5), "0:00");
});

test("shuffle conserva los elementos y countOnline cuenta conectados", () => {
  const items = [1, 2, 3, 4, 5];
  assert.deepEqual(shuffle(items).sort(), items);
  assert.equal(countOnline({ a: { online: true }, b: { online: false }, c: null }), 1);
});
