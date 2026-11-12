import { describe, expect, it } from 'vitest';
import { bfs } from '../../core/algorithms/bfs';
import { hierholzer } from '../../core/algorithms/hierholzer';
import { parseTiles } from '../../core/algorithms/tiles';
import { CHALLENGES, challengeGraph, LEVELS } from './challenge-bank';

const byId = (id: string) => CHALLENGES.find((c) => c.id === id)!;

describe('Banco de desafíos', () => {
  it('cubre los 6 niveles con ids únicos y explicaciones calculables', () => {
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(CHALLENGES.length);
    for (const l of LEVELS) expect(CHALLENGES.filter((c) => c.level === l.level).length).toBeGreaterThan(1);
    for (const c of CHALLENGES) expect(c.explain(challengeGraph(c)).length).toBeGreaterThan(0);
  });
  it('valida respuestas numéricas, de opción y de vértices con el motor', () => {
    const grado = byId('n2-grado');
    expect(grado.check(challengeGraph(grado), { kind: 'number', value: 5 }).correct).toBe(true);
    expect(grado.check(challengeGraph(grado), { kind: 'number', value: 4 }).correct).toBe(false);
    const bucles = byId('n1-bucles');
    expect(bucles.check(challengeGraph(bucles), { kind: 'vertex-set', value: [6, 1, 3] }).correct).toBe(true);
    const cond = byId('n5-condicion');
    expect(cond.check(challengeGraph(cond), { kind: 'choice', value: 'Camino euleriano abierto' }).correct).toBe(true);
    const quitar = byId('n6-quitar');
    expect(challengeGraph(quitar).size).toBe(27);
    expect(quitar.check(challengeGraph(quitar), { kind: 'choice', value: 'Camino euleriano abierto' }).correct).toBe(true);
  });
  it('acepta el orden BFS correcto y la solución de Hierholzer como cadena', () => {
    const b = byId('n3-bfs');
    const g = challengeGraph(b);
    expect(b.check(g, { kind: 'vertex-seq', value: bfs(g, 0).order }).correct).toBe(true);
    const c = byId('n5-circuito');
    const gc = challengeGraph(c);
    const trail = hierholzer(gc)!.trail;
    const tiles = trail.edges.map((id) => parseTiles(id.split('#')[0])[0]);
    expect(c.check(gc, { kind: 'tile-seq', value: tiles }).correct).toBe(true);
    expect(c.check(gc, { kind: 'tile-seq', value: tiles.slice(0, 3) }).correct).toBe(false);
  });
});
