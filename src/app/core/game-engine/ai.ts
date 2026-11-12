import { generateTileSet, isDouble, pipSum } from '../algorithms/tiles';
import { Tile } from '../models/graph.models';
import { canDraw, chainEnds, drawTile, handPoints, legalMoves, opponent, passTurn, playMove, Rng, seededRng, shuffle } from './game-engine';
import { AiLevel, GameState, Move, PlayerId } from './game.models';

export interface MoveEvaluation {
  readonly move: Move;
  readonly score: number;
  readonly breakdown: readonly { label: string; value: number }[];
}

export interface AiDecision {
  readonly move: Move;
  readonly evaluations: readonly MoveEvaluation[];
  readonly summary: string;
}

/**
 * IA heurística de la computadora. No elige al azar: puntúa cada jugada legal
 * con criterios estratégicos y toma la mejor.
 *
 *  - Puntos de la ficha: deshacerse primero de fichas pesadas.
 *  - Dobles: son difíciles de colocar más adelante.
 *  - Conexiones disponibles: cuántas fichas propias encajarán en los nuevos extremos.
 *  - Distribución: preferir extremos con valores que la IA domina.
 *  - Riesgo de bloqueo: penaliza quedarse sin fichas compatibles.
 *  - Respuesta del rival: premia extremos con valores que el rival no tiene
 *    (robó o pasó ante ellos) o de los que quedan pocas fichas sin ver.
 *
 * Nivel 'experto': búsqueda Minimax con poda alfa-beta sobre varias manos
 * plausibles del rival (información imperfecta), usando la heurística en las hojas.
 */
export function chooseMove(s: GameState, level: AiLevel = 'estrategico', rng: Rng = seededRng(s.turn * 7919)): AiDecision | null {
  const moves = legalMoves(s);
  if (moves.length === 0) return null;
  const evaluations = moves.map((m) => evaluateMove(s, m, level));

  if (level === 'experto' && moves.length > 1) {
    const totals = new Map<Move, number>(moves.map((m) => [m, 0]));
    const samples = 6;
    for (let k = 0; k < samples; k++) {
      const world = determinize(s, rng);
      for (const m of moves) {
        const v = alphaBeta(playMove(world, m), 4, -Infinity, Infinity, s.current);
        totals.set(m, totals.get(m)! + v);
      }
    }
    const ranked = evaluations
      .map((e) => {
        const mm = totals.get(e.move)! / samples;
        return { ...e, score: round(mm + e.score * 0.1), breakdown: [...e.breakdown, { label: 'Minimax α-β (promedio)', value: round(mm) }] };
      })
      .sort((a, b) => b.score - a.score);
    return { move: ranked[0].move, evaluations: ranked, summary: describe(ranked[0], 'experto') };
  }

  const ranked = [...evaluations].sort((a, b) => b.score - a.score);
  return { move: ranked[0].move, evaluations: ranked, summary: describe(ranked[0], level) };
}

export function evaluateMove(s: GameState, m: Move, level: AiLevel): MoveEvaluation {
  const me = s.current;
  const tile = s.hands[me].find((t) => t.id === m.tileId)!;
  const after = playMove(s, m);
  const breakdown: { label: string; value: number }[] = [];
  breakdown.push({ label: 'Puntos de la ficha', value: pipSum(tile) });
  if (level !== 'basico') {
    if (isDouble(tile)) breakdown.push({ label: 'Es doble', value: 3 });
    const rest = after.hands[me];
    const ends = chainEnds(after);
    if (ends && rest.length > 0) {
      const fits = rest.filter((t) => [t.a, t.b].some((x) => x === ends.left || x === ends.right)).length;
      breakdown.push({ label: 'Conexiones propias disponibles', value: fits * 2 });
      if (fits === 0) breakdown.push({ label: 'Riesgo de bloqueo', value: -6 });
      const holding = (x: number) => rest.filter((t) => t.a === x || t.b === x).length;
      breakdown.push({ label: 'Distribución de valores', value: Math.max(holding(ends.left), holding(ends.right)) });
      const missing = s.knownMissing[opponent(me)];
      const blocked = [ends.left, ends.right].filter((x) => missing.includes(x)).length;
      if (blocked) breakdown.push({ label: 'Valores que el rival no tiene', value: blocked * 4 });
      const unseenWith = (x: number) => unseenTiles(s, me).filter((t) => t.a === x || t.b === x).length;
      const scarce = [ends.left, ends.right].filter((x) => unseenWith(x) <= 1).length;
      if (scarce) breakdown.push({ label: 'Extremos escasos para el rival', value: scarce * 1.5 });
    }
    if (after.status === 'finished' && after.result?.winner === me) breakdown.push({ label: 'Gana la partida', value: 100 });
  }
  return { move: m, score: round(breakdown.reduce((a, b) => a + b.value, 0)), breakdown };
}

/** Fichas que el jugador no ha visto: ni en su mano ni en la mesa. */
export function unseenTiles(s: GameState, me: PlayerId): Tile[] {
  const seen = new Set([...s.hands[me], ...s.chain.map((c) => c.tile)].map((t) => t.id));
  return generateTileSet(s.rules.maxPip).filter((t) => !seen.has(t.id));
}

/** Construye un "mundo" plausible repartiendo las fichas no vistas entre el rival y el pozo. */
function determinize(s: GameState, rng: Rng): GameState {
  const me = s.current;
  const opp = opponent(me);
  const pool = shuffle(unseenTiles(s, me), rng);
  const missing = s.knownMissing[opp];
  const allowed = pool.filter((t) => !missing.includes(t.a) && !missing.includes(t.b));
  const others = pool.filter((t) => !allowed.includes(t));
  const n = s.hands[opp].length;
  const oppHand = [...allowed, ...others].slice(0, n);
  const ids = new Set(oppHand.map((t) => t.id));
  return { ...s, hands: { ...s.hands, [opp]: oppHand }, boneyard: pool.filter((t) => !ids.has(t.id)) };
}

/** Minimax con poda alfa-beta. `me` maximiza. */
function alphaBeta(s: GameState, depth: number, alpha: number, beta: number, me: PlayerId): number {
  if (s.status === 'finished') {
    const w = s.result!.winner;
    return w === me ? 100 + s.result!.score : w === null ? 0 : -100 - s.result!.score;
  }
  if (depth === 0) return staticEval(s, me);
  const moves = legalMoves(s);
  let children: GameState[];
  if (moves.length) children = moves.map((m) => playMove(s, m));
  else if (canDraw(s)) children = [drawTile(s)];
  else children = [passTurn(s)];
  const maximizing = s.current === me;
  let best = maximizing ? -Infinity : Infinity;
  for (const c of children) {
    const v = alphaBeta(c, depth - 1, alpha, beta, me);
    if (maximizing) {
      best = Math.max(best, v);
      alpha = Math.max(alpha, v);
    } else {
      best = Math.min(best, v);
      beta = Math.min(beta, v);
    }
    if (beta <= alpha) break;
  }
  return best;
}

function staticEval(s: GameState, me: PlayerId): number {
  const opp = opponent(me);
  const mobility = legalMoves({ ...s, current: me }, me).length - legalMoves({ ...s, current: opp }, opp).length;
  return (s.hands[opp].length - s.hands[me].length) * 6 + (handPoints(s.hands[opp]) - handPoints(s.hands[me])) * 0.5 + mobility * 2;
}

function describe(e: MoveEvaluation, level: AiLevel): string {
  const top = [...e.breakdown].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 2).map((b) => b.label.toLowerCase());
  const lvl = level === 'basico' ? 'Básico' : level === 'estrategico' ? 'Estratégico' : 'Experto';
  return `[${lvl}] Juega ${e.move.tileId} por la ${e.move.side === 'left' ? 'izquierda' : 'derecha'} (puntuación ${e.score}). Pesó más: ${top.join(' y ')}.`;
}

function round(x: number): number {
  return Math.round(x * 10) / 10;
}
