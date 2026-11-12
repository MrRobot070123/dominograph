import { MultiGraph, other } from '../graph-engine/multigraph';
import { Trail, VertexId } from '../models/graph.models';
import { analyzeEuler } from './euler';
import { sortedIncident } from './traversal-utils';

export interface FleuryCandidate {
  readonly edgeId: string;
  readonly to: VertexId;
  readonly isBridge: boolean;
}

export interface FleuryStep {
  readonly at: VertexId;
  readonly candidates: readonly FleuryCandidate[];
  readonly chosen: string;
  readonly to: VertexId;
  readonly message: string;
}

export interface FleuryResult {
  readonly trail: Trail;
  readonly steps: readonly FleuryStep[];
}

/**
 * Algoritmo de Fleury (herramienta didáctica).
 * En cada paso elige una arista que no sea puente en el grafo restante,
 * salvo que sea la única opción. Así nunca se "corta" el acceso a aristas
 * que aún faltan por recorrer.
 * Complejidad: O(|E|²) — no se usa para grafos grandes.
 */
export function fleury(g: MultiGraph, preferredStart?: VertexId): FleuryResult | null {
  const analysis = analyzeEuler(g);
  if (analysis.kind === 'none' || analysis.kind === 'empty') return null;
  let current = analysis.start!;
  if (preferredStart !== undefined && g.degree(preferredStart) > 0 && (analysis.kind === 'circuit' || analysis.oddVertices.includes(preferredStart))) {
    current = preferredStart;
  }
  let rest = g;
  const vertices: VertexId[] = [current];
  const edges: string[] = [];
  const steps: FleuryStep[] = [];

  while (rest.size > 0) {
    const options = sortedIncident(rest, current);
    if (options.length === 0) break;
    const candidates = options.map((e) => ({ edgeId: e.id, to: other(e, current), isBridge: options.length > 1 && isBridge(rest, e.id, current) }));
    const pick = candidates.find((c) => !c.isBridge) ?? candidates[0];
    const reason = options.length === 1
      ? `Es la única ficha disponible desde ${current}.`
      : pick.isBridge
        ? 'Todas las opciones son puentes; se toma la primera.'
        : candidates.some((c) => c.isBridge)
          ? `Se evitan los puentes (${candidates.filter((c) => c.isBridge).map((c) => c.edgeId).join(', ')}) porque cruzarlos ahora dejaría fichas inalcanzables.`
          : 'Ninguna opción es puente; se toma la primera.';
    steps.push({ at: current, candidates, chosen: pick.edgeId, to: pick.to, message: `En ${current} se elige ${pick.edgeId} → ${pick.to}. ${reason}` });
    rest = rest.removeEdge(pick.edgeId);
    edges.push(pick.edgeId);
    current = pick.to;
    vertices.push(current);
  }
  return { trail: { vertices, edges, closed: analysis.kind === 'circuit' }, steps };
}

/**
 * Una arista es puente si al quitarla disminuye el número de vértices
 * alcanzables desde `from`. Los bucles nunca son puentes.
 */
export function isBridge(g: MultiGraph, edgeId: string, from: VertexId): boolean {
  const e = g.edge(edgeId);
  if (!e || e.u === e.v) return false;
  return reachableCount(g.removeEdge(edgeId), from) < reachableCount(g, from);
}

function reachableCount(g: MultiGraph, s: VertexId): number {
  const seen = new Set([s]);
  const st = [s];
  while (st.length) {
    const v = st.pop()!;
    for (const e of g.incidentEdges(v)) {
      const w = other(e, v);
      if (!seen.has(w)) {
        seen.add(w);
        st.push(w);
      }
    }
  }
  return seen.size;
}
