import { MultiGraph, other } from '../graph-engine/multigraph';
import { VertexId } from '../models/graph.models';

/** Componentes conexas (cada vértice aislado es su propia componente). O(|V| + |E|). */
export function connectedComponents(g: MultiGraph): VertexId[][] {
  const seen = new Set<VertexId>();
  const comps: VertexId[][] = [];
  for (const s of g.vertices) {
    if (seen.has(s)) continue;
    const comp: VertexId[] = [];
    const stack = [s];
    seen.add(s);
    while (stack.length) {
      const v = stack.pop()!;
      comp.push(v);
      for (const e of g.incidentEdges(v)) {
        const w = other(e, v);
        if (!seen.has(w)) {
          seen.add(w);
          stack.push(w);
        }
      }
    }
    comps.push(comp.sort((a, b) => a - b));
  }
  return comps;
}

/** Un grafo es conexo si tiene exactamente una componente (el grafo vacío se considera no conexo). */
export function isConnected(g: MultiGraph): boolean {
  return connectedComponents(g).length === 1;
}

/** Componentes que contienen al menos una arista (lo relevante para Euler). */
export function edgeComponents(g: MultiGraph): VertexId[][] {
  return connectedComponents(g).filter((c) => c.some((v) => g.incidentEdges(v).length > 0));
}
