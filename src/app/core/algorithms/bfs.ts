import { MultiGraph, other } from '../graph-engine/multigraph';
import { TraversalResult, TraversalStep, VertexId } from '../models/graph.models';
import { assertVertex, sortedIncident } from './traversal-utils';

/**
 * Búsqueda en anchura (BFS).
 * Entrada: grafo y vértice inicial. Salida: orden de visita, aristas del
 * árbol BFS, distancias, vértices no alcanzables y pasos para animación.
 * Complejidad: O(|V| + |E|) tiempo, O(|V|) espacio.
 */
export function bfs(g: MultiGraph, start: VertexId): TraversalResult {
  assertVertex(g, start);
  const visited = new Set<VertexId>([start]);
  const distance = new Map<VertexId, number>([[start, 0]]);
  const order: VertexId[] = [];
  const treeEdges: string[] = [];
  const queue: VertexId[] = [start];
  const steps: TraversalStep[] = [];
  const snap = (s: Omit<TraversalStep, 'frontier' | 'visited'>): void => {
    steps.push({ ...s, frontier: [...queue], visited: [...visited] });
  };
  snap({ kind: 'start', vertex: start, message: `Se encola el vértice inicial ${start}.` });

  while (queue.length > 0) {
    const v = queue.shift()!;
    order.push(v);
    snap({ kind: 'visit', vertex: v, message: `Se extrae ${v} de la cola y se exploran sus aristas.` });
    for (const e of sortedIncident(g, v)) {
      const w = other(e, v);
      if (!visited.has(w)) {
        visited.add(w);
        distance.set(w, (distance.get(v) ?? 0) + 1);
        treeEdges.push(e.id);
        queue.push(w);
        snap({ kind: 'discover', vertex: w, from: v, edgeId: e.id, message: `Por la ficha ${e.id} se descubre ${w} (distancia ${distance.get(w)}); se encola.` });
      } else {
        snap({ kind: 'skip', vertex: w, from: v, edgeId: e.id, message: w === v ? `La ficha ${e.id} es un bucle: no descubre vértices nuevos.` : `La ficha ${e.id} lleva a ${w}, que ya fue descubierto.` });
      }
    }
  }
  const unreachable = g.vertices.filter((v) => !visited.has(v));
  snap({ kind: 'done', vertex: start, message: unreachable.length ? `Fin. No alcanzables desde ${start}: ${unreachable.join(', ')}.` : `Fin. Todos los vértices son alcanzables desde ${start}.` });
  return { algorithm: 'BFS', start, order, treeEdges, unreachable, steps, distance };
}
