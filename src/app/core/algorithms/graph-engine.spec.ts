import { describe, expect, it } from 'vitest';
import { MultiGraph } from '../graph-engine/multigraph';
import { adjacencyList, adjacencyMatrix, degreeFromMatrix } from './adjacency';
import { findChains } from './backtracking';
import { bfs } from './bfs';
import { compareGraphs } from './compare';
import { connectedComponents, isConnected } from './components';
import { degreeMap, handshake, oddVertices } from './degree';
import { dfs } from './dfs';
import { analyzeEuler } from './euler';
import { fleury, isBridge } from './fleury';
import { hierholzer, validateEulerTrail } from './hierholzer';
import { validateTileSequence } from './sequence';
import { expectedTileCount, generateTileSet, isDouble, parseTiles } from './tiles';
import { analyzeWalk } from './walk';

const full = () => MultiGraph.fromTiles(generateTileSet(6));
const g = (text: string, vertices?: number[]) => MultiGraph.fromTiles(parseTiles(text), vertices);

describe('Prueba 1 — generación de fichas', () => {
  it('genera exactamente 28 fichas distintas para el doble-seis', () => {
    const tiles = generateTileSet(6);
    expect(tiles).toHaveLength(28);
    expect(new Set(tiles.map((t) => t.id)).size).toBe(28);
    expect(tiles.every((t) => t.a <= t.b && t.a >= 0 && t.b <= 6)).toBe(true);
  });
  it('funciona para otros conjuntos (doble-nueve = 55 fichas)', () => {
    expect(generateTileSet(9)).toHaveLength(expectedTileCount(9));
    expect(expectedTileCount(9)).toBe(55);
  });
});

describe('Prueba 2 — fichas dobles', () => {
  it('identifica las 7 dobles y 21 fichas no dobles', () => {
    const tiles = generateTileSet(6);
    const doubles = tiles.filter(isDouble).map((t) => t.id);
    expect(doubles).toEqual(['0-0', '1-1', '2-2', '3-3', '4-4', '5-5', '6-6']);
    expect(tiles.filter((t) => !isDouble(t))).toHaveLength(21);
  });
});

describe('Prueba 3 — grado con bucles', () => {
  it('un bucle aporta 2 al grado', () => {
    const m = g('4-4');
    expect(m.degree(4)).toBe(2);
    expect(g('4-4, 4-1').degree(4)).toBe(3);
  });
  it('el dominó completo tiene grado 8 en cada vértice y cumple el apretón de manos', () => {
    const d = degreeMap(full());
    expect([...d.values()]).toEqual([8, 8, 8, 8, 8, 8, 8]);
    const h = handshake(full());
    expect(h.degreeSum).toBe(56);
    expect(h.holds).toBe(true);
  });
});

describe('Prueba 4 — aristas paralelas', () => {
  it('conserva dos fichas 1-3 como aristas independientes', () => {
    const m = g('1-3, 1-3, 3-3');
    expect(m.size).toBe(3);
    expect(m.edgesBetween(1, 3).map((e) => e.id)).toEqual(['1-3', '1-3#2']);
    expect(m.parallelGroups()).toHaveLength(1);
    expect(m.degree(3)).toBe(4);
  });
  it('addEdge asigna ids únicos a las paralelas', () => {
    const m = MultiGraph.empty().addEdge(2, 5).addEdge(5, 2).addEdge(2, 5);
    expect(m.edges.map((e) => e.id)).toEqual(['2-5', '2-5#2', '2-5#3']);
  });
  it('eliminar un vértice elimina sus aristas incidentes', () => {
    const m = g('0-1, 1-2, 2-2').removeVertex(2);
    expect(m.vertices).toEqual([0, 1]);
    expect(m.edges.map((e) => e.id)).toEqual(['0-1']);
  });
});

describe('Prueba 5 — matriz y lista de adyacencia', () => {
  it('cuenta aristas paralelas fuera de la diagonal y bucles en la diagonal', () => {
    const a = adjacencyMatrix(g('0-1, 0-1, 1-1, 1-2'));
    expect(a.labels).toEqual([0, 1, 2]);
    expect(a.matrix).toEqual([
      [0, 2, 0],
      [2, 1, 1],
      [0, 1, 0],
    ]);
    expect(degreeFromMatrix(a, 1)).toBe(5); // 2 + 1 + 1 (fila) + 1 (bucle)
  });
  it('la matriz del dominó completo tiene 1 en todas las posiciones', () => {
    const a = adjacencyMatrix(full());
    expect(a.matrix.every((row) => row.every((x) => x === 1))).toBe(true);
    expect(a.labels.map((_, i) => degreeFromMatrix(a, i))).toEqual([8, 8, 8, 8, 8, 8, 8]);
  });
  it('la lista conserva la identidad de cada arista', () => {
    const l = adjacencyList(g('1-3, 1-3'));
    expect(l[0].entries.map((e) => e.edgeId)).toEqual(['1-3', '1-3#2']);
  });
});

describe('Prueba 6 — conectividad', () => {
  it('identifica componentes conexas', () => {
    const m = g('0-1, 1-2, 4-5', [0, 1, 2, 3, 4, 5, 6]);
    expect(connectedComponents(m)).toEqual([[0, 1, 2], [3], [4, 5], [6]]);
    expect(isConnected(m)).toBe(false);
    expect(isConnected(full())).toBe(true);
  });
  it('BFS y DFS recorren en el orden esperado y detectan no alcanzables', () => {
    const m = g('0-1, 0-2, 1-3, 2-3', [0, 1, 2, 3, 4]);
    expect(bfs(m, 0).order).toEqual([0, 1, 2, 3]);
    expect(dfs(m, 0).order).toEqual([0, 1, 3, 2]);
    expect(bfs(m, 0).unreachable).toEqual([4]);
    expect(bfs(m, 0).distance.get(3)).toBe(2);
  });
});

describe('Prueba 7 — circuito euleriano', () => {
  it('detecta circuito en el dominó completo', () => {
    const a = analyzeEuler(full());
    expect(a.kind).toBe('circuit');
    expect(a.oddVertices).toEqual([]);
  });
  it('los vértices aislados no impiden el circuito', () => {
    expect(analyzeEuler(g('0-1, 1-2, 2-0', [0, 1, 2, 3, 4, 5, 6])).kind).toBe('circuit');
  });
});

describe('Prueba 8 — camino euleriano abierto', () => {
  it('detecta camino entre los dos vértices impares', () => {
    const a = analyzeEuler(g('0-1, 1-2, 2-2'));
    expect(a.kind).toBe('path');
    expect(a.oddVertices).toEqual([0, 2]);
    expect(a.start).toBe(0);
  });
});

describe('Prueba 9 — rechazo de grafos no eulerianos', () => {
  it('rechaza más de dos vértices impares', () => {
    const a = analyzeEuler(g('0-1, 0-2, 0-3'));
    expect(a.kind).toBe('none');
    expect(a.oddVertices).toHaveLength(4);
    expect(hierholzer(g('0-1, 0-2, 0-3'))).toBeNull();
  });
  it('rechaza aristas en componentes distintas aunque los grados sean pares', () => {
    expect(analyzeEuler(g('0-0, 1-2, 2-3, 3-1')).kind).toBe('none');
  });
});

describe('Prueba 10 — validación de Hierholzer', () => {
  it('construye un circuito válido con las 28 fichas', () => {
    const r = hierholzer(full())!;
    expect(r.validation.valid).toBe(true);
    expect(r.trail.edges).toHaveLength(28);
    expect(new Set(r.trail.edges).size).toBe(28);
    expect(r.trail.vertices[0]).toBe(r.trail.vertices[28]);
  });
  it('admite bucles y aristas paralelas', () => {
    const m = g('1-3, 1-3, 3-3, 1-1');
    const r = hierholzer(m)!;
    expect(r.validation.valid).toBe(true);
    expect([...r.trail.edges].sort()).toEqual(['1-1', '1-3', '1-3#2', '3-3']);
  });
  it('camino abierto empieza y termina en los vértices impares', () => {
    const r = hierholzer(g('0-1, 1-2, 2-3, 3-1'))!;
    expect(r.validation.valid).toBe(true);
    expect(r.trail.closed).toBe(false);
    expect([r.trail.vertices[0], r.trail.vertices[r.trail.vertices.length - 1]].sort()).toEqual([0, 1]);
  });
  it('el validador detecta recorridos incorrectos', () => {
    const m = g('0-1, 1-2, 2-0');
    expect(validateEulerTrail(m, { vertices: [0, 1, 2, 0], edges: ['0-1', '1-2', '0-2'], closed: true }).valid).toBe(true);
    expect(validateEulerTrail(m, { vertices: [0, 1, 0, 1], edges: ['0-1', '0-1', '0-1'], closed: false }).valid).toBe(false);
    expect(validateEulerTrail(m, { vertices: [0, 2, 1], edges: ['0-2', '1-2'], closed: false }).valid).toBe(false);
  });
  it('Fleury también produce un recorrido válido y evita puentes', () => {
    const m = g('0-1, 1-2, 2-0, 2-3, 3-4, 4-2');
    const r = fleury(m)!;
    expect(validateEulerTrail(m, r.trail).valid).toBe(true);
    expect(isBridge(g('0-1, 1-2, 2-0, 2-3'), '2-3', 2)).toBe(true);
    expect(isBridge(g('0-1, 1-2, 2-0, 2-3'), '0-1', 0)).toBe(false);
  });
});

describe('Caminos, ciclos y secuencias', () => {
  const m = g('0-1, 1-2, 2-0, 2-3, 1-3, 1-3');
  it('clasifica camino simple, ciclo, circuito y repetición', () => {
    expect(analyzeWalk(m, [0, 1, 2, 3]).type).toBe('camino-simple');
    expect(analyzeWalk(m, [0, 1, 2, 0]).type).toBe('ciclo');
    expect(analyzeWalk(m, [1, 3, 1]).type).toBe('ciclo'); // dos fichas 1-3 paralelas
    expect(analyzeWalk(m, [0, 1, 3, 2, 1, 0]).type).toBe('camino');
    expect(analyzeWalk(m, [0, 1, 3, 1, 2, 0]).type).toBe('circuito');
    expect(analyzeWalk(m, [0, 3]).valid).toBe(false);
  });
  it('valida una secuencia de fichas y su orientación', () => {
    const v = validateTileSequence(m, parseTiles('1-0, 0-2, 2-3, 3-1'));
    expect(v.valid).toBe(true);
    expect(v.links.map((l) => `${l.from}|${l.to}`)).toEqual(['1|0', '0|2', '2|3', '3|1']);
    expect(v.closed).toBe(true);
    expect(validateTileSequence(m, parseTiles('0-1, 2-3')).valid).toBe(false);
  });
  it('backtracking encuentra secuencias eulerianas y cadenas de longitud dada', () => {
    const tri = g('0-1, 1-2, 2-0');
    expect(findChains(tri, 0, { mode: 'all' }).solutions).toHaveLength(2);
    const r = findChains(g('0-1, 0-2, 0-3'), 0, { mode: 'all' });
    expect(r.solutions).toHaveLength(0);
    expect(r.backtracks).toBeGreaterThan(0);
    expect(findChains(g('0-1, 0-2, 0-3'), 1, { mode: 'length', targetLength: 2 }).solutions).toHaveLength(2);
  });
  it('compara dos configuraciones', () => {
    const c = compareGraphs(full(), full().removeEdge('0-1'));
    expect(c.edgesOnlyA).toEqual(['0-1']);
    expect(c.oddCount).toEqual({ a: 0, b: 2 });
    expect(c.euler).toEqual({ a: 'circuit', b: 'path' });
  });
});
