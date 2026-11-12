import { MultiGraph, other } from '../graph-engine/multigraph';
import { TraversalResult, TraversalStep, VertexId } from '../models/graph.models';
import { assertVertex, sortedIncident } from './traversal-utils';

/**
 * Búsqueda en profundidad (DFS) iterativa que reproduce el orden de la
 * versión recursiva (explora la primera arista disponible y retrocede).
 * Complejidad: O(|V| + |E|) tiempo, O(|V|) espacio.
 */
export function dfs(g: MultiGraph, start: VertexId): TraversalResult {
  assertVertex(g, start);
  const visited = new Set<VertexId>([start]);
  const distance = new Map<VertexId, number>([[start, 0]]);
  const order: VertexId[] = [start];
  const treeEdges: string[] = [];
  const stack: { v: VertexId; i: number }[] = [{ v: start, i: 0 }];
  const steps: TraversalStep[] = [];
  const snap = (s: Omit<TraversalStep, 'frontier' | 'visited'>): void => {
    steps.push({ ...s, frontier: stack.map((f) => f.v), visited: [...visited] });
  };
  snap({ kind: 'start', vertex: start, message: `Se visita el vértice inicial ${start} y se apila.` });

  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    const inc = sortedIncident(g, top.v);
    if (top.i < inc.length) {
      const e = inc[top.i++];
      const w = other(e, top.v);
      if (!visited.has(w)) {
        visited.add(w);
        distance.set(w, (distance.get(top.v) ?? 0) + 1);
        order.push(w);
        treeEdges.push(e.id);
        stack.push({ v: w, i: 0 });
        snap({ kind: 'discover', vertex: w, from: top.v, edgeId: e.id, message: `Desde ${top.v}, por la ficha ${e.id}, se avanza en profundidad hasta ${w}.` });
      } else {
        snap({ kind: 'skip', vertex: w, from: top.v, edgeId: e.id, message: w === top.v ? `La ficha ${e.id} es un bucle en ${w}; se ignora.` : `La ficha ${e.id} lleva a ${w}, ya visitado.` });
      }
    } else {
      stack.pop();
      snap({ kind: 'backtrack', vertex: top.v, message: `${top.v} no tiene más aristas por explorar: se retrocede.` });
    }
  }
  const unreachable = g.vertices.filter((v) => !visited.has(v));
  snap({ kind: 'done', vertex: start, message: unreachable.length ? `Fin. No alcanzables desde ${start}: ${unreachable.join(', ')}.` : `Fin. Todos los vértices son alcanzables desde ${start}.` });
  return { algorithm: 'DFS', start, order, treeEdges, unreachable, steps, distance };
}
