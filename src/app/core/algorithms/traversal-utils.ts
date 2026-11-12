import { MultiGraph, other } from '../graph-engine/multigraph';
import { GraphEdge, VertexId } from '../models/graph.models';

/** Aristas incidentes ordenadas por vecino e id, para recorridos deterministas. */
export function sortedIncident(g: MultiGraph, v: VertexId): GraphEdge[] {
  return [...g.incidentEdges(v)].sort((a, b) => other(a, v) - other(b, v) || a.id.localeCompare(b.id));
}

export function assertVertex(g: MultiGraph, v: VertexId): void {
  if (!g.hasVertex(v)) throw new Error(`El vértice ${v} no pertenece al grafo.`);
}
