import { generateTileSet, isDouble, pipSum } from '../algorithms/tiles';
import { MultiGraph } from '../graph-engine/multigraph';
import { Tile } from '../models/graph.models';
import { DEFAULT_RULES, GameEvent, GameResult, GameRules, GameState, Move, PlacedTile, PlayerId, Side } from './game.models';

/**
 * Motor del juego de dominó. Funciones puras: cada acción recibe un estado y
 * devuelve uno nuevo, lo que facilita las pruebas, el historial y la IA.
 */

export type Rng = () => number;

/** Generador pseudoaleatorio reproducible (mulberry32) para pruebas. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function opponent(p: PlayerId): PlayerId {
  return p === 'human' ? 'cpu' : 'human';
}

export function handPoints(hand: readonly Tile[]): number {
  return hand.reduce((s, t) => s + pipSum(t), 0);
}

/** Crea y reparte una partida. */
export function createGame(rules: GameRules = DEFAULT_RULES, rng: Rng = Math.random): GameState {
  const deck = shuffle(generateTileSet(rules.maxPip), rng);
  if (rules.handSize * 2 > deck.length) throw new Error('No hay suficientes fichas para repartir.');
  const human = deck.slice(0, rules.handSize);
  const cpu = deck.slice(rules.handSize, rules.handSize * 2);
  const boneyard = deck.slice(rules.handSize * 2);
  return startFromHands(rules, human, cpu, boneyard);
}

/** Inicia una partida con manos conocidas (útil para pruebas y desafíos). */
export function startFromHands(rules: GameRules, human: Tile[], cpu: Tile[], boneyard: Tile[]): GameState {
  let current: PlayerId = 'human';
  let openingTileId: string | null = null;
  let message = 'Comienza el jugador humano.';
  if (rules.startRule === 'cpu-first') {
    current = 'cpu';
    message = 'Comienza la computadora.';
  } else if (rules.startRule === 'highest-double') {
    const best = (hand: Tile[]) => [...hand].sort((x, y) => rank(y) - rank(x))[0];
    const h = best(human);
    const c = best(cpu);
    const winner = rank(h) >= rank(c) ? h : c;
    current = winner === h ? 'human' : 'cpu';
    openingTileId = winner.id;
    message = `${current === 'human' ? 'Tú sales' : 'La computadora sale'} con ${winner.id} (${isDouble(winner) ? 'el doble más alto' : 'nadie tiene dobles: ficha de más puntos'}).`;
  }
  return {
    rules,
    hands: { human, cpu },
    boneyard,
    chain: [],
    current,
    openingTileId,
    consecutivePasses: 0,
    drawsThisTurn: 0,
    turn: 1,
    status: 'playing',
    result: null,
    history: [{ turn: 0, player: current, kind: 'pass', message }],
    knownMissing: { human: [], cpu: [] },
  };
}

/** Prioridad para la salida: primero dobles (mayor valor), luego mayor suma. */
function rank(t: Tile): number {
  return isDouble(t) ? 100 + t.a : pipSum(t);
}

export function chainEnds(s: GameState): { left: number; right: number } | null {
  if (s.chain.length === 0) return null;
  return { left: s.chain[0].left, right: s.chain[s.chain.length - 1].right };
}

/** Jugadas legales del jugador. Si ambos extremos son iguales, se ofrece un solo lado. */
export function legalMoves(s: GameState, player: PlayerId = s.current): Move[] {
  if (s.status !== 'playing') return [];
  const hand = s.hands[player];
  const ends = chainEnds(s);
  if (!ends) {
    if (s.openingTileId) return hand.some((t) => t.id === s.openingTileId) ? [{ tileId: s.openingTileId, side: 'right' }] : [];
    return hand.map((t) => ({ tileId: t.id, side: 'right' as Side }));
  }
  const moves: Move[] = [];
  for (const t of hand) {
    const fitsLeft = t.a === ends.left || t.b === ends.left;
    const fitsRight = t.a === ends.right || t.b === ends.right;
    if (fitsLeft) moves.push({ tileId: t.id, side: 'left' });
    if (fitsRight && !(fitsLeft && ends.left === ends.right)) moves.push({ tileId: t.id, side: 'right' });
  }
  return moves;
}

export function isLegal(s: GameState, m: Move, player: PlayerId = s.current): boolean {
  return legalMoves(s, player).some((x) => x.tileId === m.tileId && x.side === m.side);
}

/** Coloca una ficha. Lanza error si la jugada no es legal. */
export function playMove(s: GameState, m: Move): GameState {
  if (s.status !== 'playing') throw new Error('La partida ya terminó.');
  if (!isLegal(s, m)) throw new Error(`Jugada no válida: ${m.tileId} por la ${m.side === 'left' ? 'izquierda' : 'derecha'}.`);
  const p = s.current;
  const tile = s.hands[p].find((t) => t.id === m.tileId)!;
  const ends = chainEnds(s);
  let placed: PlacedTile;
  let chain: PlacedTile[];
  if (!ends) {
    placed = { tile, left: tile.a, right: tile.b, by: p, turn: s.turn };
    chain = [placed];
  } else if (m.side === 'left') {
    const right = ends.left;
    const left = tile.a === right ? tile.b : tile.a;
    placed = { tile, left, right, by: p, turn: s.turn };
    chain = [placed, ...s.chain];
  } else {
    const left = ends.right;
    const right = tile.a === left ? tile.b : tile.a;
    placed = { tile, left, right, by: p, turn: s.turn };
    chain = [...s.chain, placed];
  }
  const hand = s.hands[p].filter((t) => t.id !== tile.id);
  const who = p === 'human' ? 'Tú' : 'CPU';
  const ev: GameEvent = { turn: s.turn, player: p, kind: 'play', tileId: tile.id, side: m.side, message: `${who}: ${placed.left}|${placed.right}${ends ? ` por la ${m.side === 'left' ? 'izquierda' : 'derecha'}` : ' (salida)'}` };
  const next: GameState = {
    ...s,
    hands: { ...s.hands, [p]: hand },
    chain,
    openingTileId: null,
    consecutivePasses: 0,
    drawsThisTurn: 0,
    current: opponent(p),
    turn: s.turn + 1,
    history: [...s.history, ev],
  };
  return hand.length === 0 ? finish(next, p, 'domino') : next;
}

export function canDraw(s: GameState): boolean {
  if (s.status !== 'playing' || s.boneyard.length === 0 || legalMoves(s).length > 0) return false;
  if (s.chain.length === 0) return false;
  if (s.rules.drawRule === 'no-draw') return false;
  if (s.rules.drawRule === 'draw-one') return s.drawsThisTurn === 0;
  return true;
}

export function canPass(s: GameState): boolean {
  return s.status === 'playing' && legalMoves(s).length === 0 && !canDraw(s);
}

/** Roba una ficha del pozo. */
export function drawTile(s: GameState): GameState {
  if (!canDraw(s)) throw new Error('No se puede robar en este momento.');
  const p = s.current;
  const [tile, ...rest] = s.boneyard;
  const ends = chainEnds(s)!;
  return {
    ...s,
    boneyard: rest,
    hands: { ...s.hands, [p]: [...s.hands[p], tile] },
    drawsThisTurn: s.drawsThisTurn + 1,
    knownMissing: addMissing(s, p, [ends.left, ends.right]),
    history: [...s.history, { turn: s.turn, player: p, kind: 'draw', message: `${p === 'human' ? 'Tú robas' : 'CPU roba'} una ficha del pozo.` }],
  };
}

/** Pasa el turno. Dos pases seguidos significan partida cerrada (bloqueada). */
export function passTurn(s: GameState): GameState {
  if (!canPass(s)) throw new Error('Solo se puede pasar si no hay jugadas ni se puede robar.');
  const p = s.current;
  const ends = chainEnds(s);
  const next: GameState = {
    ...s,
    current: opponent(p),
    consecutivePasses: s.consecutivePasses + 1,
    drawsThisTurn: 0,
    turn: s.turn + 1,
    knownMissing: ends ? addMissing(s, p, [ends.left, ends.right]) : s.knownMissing,
    history: [...s.history, { turn: s.turn, player: p, kind: 'pass', message: `${p === 'human' ? 'Pasas' : 'CPU pasa'} el turno.` }],
  };
  return next.consecutivePasses >= 2 ? finish(next, null, 'blocked') : next;
}

function addMissing(s: GameState, p: PlayerId, vals: number[]): GameState['knownMissing'] {
  return { ...s.knownMissing, [p]: [...new Set([...s.knownMissing[p], ...vals])].sort() };
}

/**
 * Cierra la partida.
 * - Dominó: gana quien se quedó sin fichas y suma los puntos del rival.
 * - Bloqueada: gana quien tenga menos puntos en mano y suma los del rival;
 *   si hay igualdad, la partida termina en empate.
 */
function finish(s: GameState, winner: PlayerId | null, reason: GameResult['reason']): GameState {
  const remaining = { human: handPoints(s.hands.human), cpu: handPoints(s.hands.cpu) };
  let w = winner;
  if (reason === 'blocked') w = remaining.human === remaining.cpu ? null : remaining.human < remaining.cpu ? 'human' : 'cpu';
  const score = w ? remaining[opponent(w)] : 0;
  const name = (p: PlayerId) => (p === 'human' ? 'Ganaste' : 'Ganó la computadora');
  const message = reason === 'domino'
    ? `${name(w!)}: se quedó sin fichas. Suma ${score} puntos.`
    : w
      ? `Partida cerrada. ${name(w)} por tener menos puntos (${remaining[w]} contra ${remaining[opponent(w)]}).`
      : `Partida cerrada con empate a ${remaining.human} puntos.`;
  return { ...s, status: 'finished', result: { winner: w, reason, remaining, score, message } };
}

// ---------------------------------------------------------------- integración con grafos

/** Multigrafo de las fichas colocadas en la mesa (vértices 0..maxPip). */
export function chainGraph(s: GameState): MultiGraph {
  return MultiGraph.fromTiles(s.chain.map((p) => p.tile), range(s.rules.maxPip));
}

/** Multigrafo de las fichas que aún no se han jugado (manos + pozo). */
export function remainingGraph(s: GameState): MultiGraph {
  return MultiGraph.fromTiles([...s.hands.human, ...s.hands.cpu, ...s.boneyard], range(s.rules.maxPip));
}

/**
 * La cadena de la mesa es un camino sin aristas repetidas en el multigrafo:
 * secuencia de vértices left0, right0 = left1, right1, …
 */
export function chainAsTrail(s: GameState): { vertices: number[]; edges: string[] } {
  if (s.chain.length === 0) return { vertices: [], edges: [] };
  return { vertices: [s.chain[0].left, ...s.chain.map((p) => p.right)], edges: s.chain.map((p) => p.tile.id) };
}

export function range(max: number): number[] {
  return Array.from({ length: max + 1 }, (_, i) => i);
}
