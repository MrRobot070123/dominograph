import { describe, expect, it } from 'vitest';
import { analyzeWalk } from '../algorithms/walk';
import { makeTile, parseTiles } from '../algorithms/tiles';
import { chooseMove } from './ai';
import { canDraw, canPass, chainAsTrail, chainGraph, createGame, drawTile, legalMoves, passTurn, playMove, remainingGraph, seededRng, startFromHands } from './game-engine';
import { DEFAULT_RULES, GameRules, GameState } from './game.models';

const rules: GameRules = { ...DEFAULT_RULES, startRule: 'human-first' };

describe('Prueba 11 — reglas y jugadas legales', () => {
  it('reparte 7 + 7 fichas y deja 14 en el pozo', () => {
    const s = createGame(DEFAULT_RULES, seededRng(1));
    expect(s.hands.human).toHaveLength(7);
    expect(s.hands.cpu).toHaveLength(7);
    expect(s.boneyard).toHaveLength(14);
  });
  it('sale el doble más alto con la regla configurada', () => {
    const s = startFromHands(DEFAULT_RULES, parseTiles('1-1, 2-3'), parseTiles('5-5, 0-1'), []);
    expect(s.current).toBe('cpu');
    expect(legalMoves(s)).toEqual([{ tileId: '5-5', side: 'right' }]);
  });
  it('solo permite fichas que encajan con algún extremo y las orienta', () => {
    let s = startFromHands(rules, parseTiles('3-4, 0-0'), parseTiles('4-6, 1-2'), []);
    s = playMove(s, { tileId: '3-4', side: 'right' });
    expect(legalMoves(s)).toEqual([{ tileId: '4-6', side: 'right' }]);
    expect(() => playMove(s, { tileId: '1-2', side: 'left' })).toThrow();
    s = playMove(s, { tileId: '4-6', side: 'right' });
    expect(s.chain.map((p) => `${p.left}|${p.right}`)).toEqual(['3|4', '4|6']);
  });
  it('obliga a robar antes de pasar y detecta partida cerrada', () => {
    let s = startFromHands(rules, parseTiles('3-3, 6-6'), parseTiles('5-5, 4-4'), [makeTile(0, 1)]);
    s = playMove(s, { tileId: '3-3', side: 'right' });
    expect(canDraw(s)).toBe(true);
    expect(canPass(s)).toBe(false);
    s = drawTile(s);
    expect(s.knownMissing.cpu).toEqual([3]);
    expect(canPass(s)).toBe(true);
    s = passTurn(s);
    expect(legalMoves(s)).toHaveLength(0);
    s = passTurn(s);
    expect(s.status).toBe('finished');
    expect(s.result!.reason).toBe('blocked');
    expect(s.result!.winner).toBe('human'); // 12 puntos contra 19
  });
  it('gana quien se queda sin fichas y suma los puntos del rival', () => {
    let s = startFromHands(rules, parseTiles('2-3'), parseTiles('6-6, 5-4'), []);
    s = playMove(s, { tileId: '2-3', side: 'right' });
    expect(s.status).toBe('finished');
    expect(s.result!.winner).toBe('human');
    expect(s.result!.score).toBe(21);
  });
});

describe('IA heurística', () => {
  it('elige una jugada legal y explica su decisión', () => {
    const s = startFromHands({ ...rules, startRule: 'cpu-first' }, parseTiles('0-0'), parseTiles('6-6, 0-1, 2-2'), []);
    const d = chooseMove(s, 'estrategico')!;
    expect(legalMoves(s).some((m) => m.tileId === d.move.tileId)).toBe(true);
    expect(d.move.tileId).toBe('6-6');
    expect(d.evaluations.length).toBe(3);
  });
  it('prefiere ganar cuando puede', () => {
    let s = startFromHands(rules, parseTiles('1-2, 5-5'), parseTiles('2-6'), []);
    s = playMove(s, { tileId: '1-2', side: 'right' });
    expect(chooseMove(s, 'experto')!.move.tileId).toBe('2-6');
  });
  it('una partida completa IA contra IA termina correctamente', () => {
    let s: GameState = createGame(DEFAULT_RULES, seededRng(42));
    let guard = 0;
    while (s.status === 'playing' && guard++ < 200) {
      const d = chooseMove(s, 'estrategico');
      s = d ? playMove(s, d.move) : canDraw(s) ? drawTile(s) : passTurn(s);
    }
    expect(s.status).toBe('finished');
    const total = s.chain.length + s.hands.human.length + s.hands.cpu.length + s.boneyard.length;
    expect(total).toBe(28);
  });
});

describe('Prueba 12 — integración juego y laboratorio', () => {
  it('la cadena de la mesa es un camino sin aristas repetidas en el multigrafo', () => {
    let s = createGame(DEFAULT_RULES, seededRng(7));
    for (let k = 0; k < 12 && s.status === 'playing'; k++) {
      const d = chooseMove(s, 'basico');
      s = d ? playMove(s, d.move) : canDraw(s) ? drawTile(s) : passTurn(s);
    }
    const g = chainGraph(s);
    const t = chainAsTrail(s);
    expect(g.size).toBe(s.chain.length);
    const w = analyzeWalk(g, t.vertices, t.edges);
    expect(w.valid).toBe(true);
    expect(w.repeatedEdges).toHaveLength(0);
    expect(w.eulerian).toBe(true); // la cadena usa todas las fichas colocadas una vez
    expect(remainingGraph(s).size + g.size).toBe(28);
  });
});
