import { MultiGraph, other } from '../graph-engine/multigraph';
import { AdjacencyListRow, AdjacencyMatrix } from '../models/graph.models';

/**
 * Matriz de adyacencia del multigrafo.
 *   A[i][j] = nº de aristas entre i y j (i ≠ j)
 *   A[i][i] = nº de bucles en i
 * Complejidad: O(|V|² + |E|).
 */
export function adjacencyMatrix(g: MultiGraph): AdjacencyMatrix {
  const labels = [...g.vertices];
  const index = new Map(labels.map((v, i) => [v, i]));
  const m = labels.map(() => labels.map(() => 0));
  for (const e of g.edges) {
    const i = index.get(e.u)!;
    const j = index.get(e.v)!;
    if (i === j) m[i][i] += 1;
    else {
      m[i][j] += 1;
      m[j][i] += 1;
    }
  }
  return { labels, matrix: m };
}

/**
 * Grado a partir de la matriz: suma de la fila i + A[i][i].
 * El término A[i][i] añade la segunda contribución de cada bucle.
 */
export function degreeFromMatrix(a: AdjacencyMatrix, i: number): number {
  return a.matrix[i].reduce((s, x) => s + x, 0) + a.matrix[i][i];
}

/**
 * Lista de adyacencia que conserva el identificador de cada arista,
 * de modo que las aristas paralelas aparecen como entradas distintas.
 * Complejidad: O(|V| + |E|).
 */
export function adjacencyList(g: MultiGraph): AdjacencyListRow[] {
  return g.vertices.map((v) => ({
    vertex: v,
    entries: g
      .incidentEdges(v)
      .map((e) => ({ neighbor: other(e, v), edgeId: e.id, isLoop: e.u === e.v }))
      .sort((x, y) => x.neighbor - y.neighbor || x.edgeId.localeCompare(y.edgeId)),
  }));
}
