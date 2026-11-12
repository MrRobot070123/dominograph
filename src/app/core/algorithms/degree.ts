import { MultiGraph } from '../graph-engine/multigraph';
import { VertexId } from '../models/graph.models';

/**
 * Grados de todos los vértices. Un bucle suma 2 al grado de su vértice.
 * Complejidad: O(|V| + |E|).
 */
export function degreeMap(g: MultiGraph): Map<VertexId, number> {
  const d = new Map<VertexId, number>();
  for (const v of g.vertices) d.set(v, 0);
  for (const e of g.edges) {
    if (e.u === e.v) d.set(e.u, (d.get(e.u) ?? 0) + 2);
    else {
      d.set(e.u, (d.get(e.u) ?? 0) + 1);
      d.set(e.v, (d.get(e.v) ?? 0) + 1);
    }
  }
  return d;
}

export function oddVertices(g: MultiGraph): VertexId[] {
  return [...degreeMap(g)].filter(([, d]) => d % 2 === 1).map(([v]) => v);
}

export function evenVertices(g: MultiGraph): VertexId[] {
  return [...degreeMap(g)].filter(([, d]) => d % 2 === 0).map(([v]) => v);
}

export interface HandshakeCheck {
  readonly degreeSum: number;
  readonly edgeCount: number;
  readonly holds: boolean;
}

/** Teorema del apretón de manos: Σ grado(v) = 2|E|. */
export function handshake(g: MultiGraph): HandshakeCheck {
  let sum = 0;
  for (const d of degreeMap(g).values()) sum += d;
  return { degreeSum: sum, edgeCount: g.size, holds: sum === 2 * g.size };
}

export interface DegreeRow {
  readonly vertex: VertexId;
  readonly simpleEdges: number;
  readonly loops: number;
  readonly degree: number;
  readonly parity: 'par' | 'impar';
  readonly isMax: boolean;
}

/** Tabla de grados con el desglose aristas simples / bucles. */
export function degreeTable(g: MultiGraph): DegreeRow[] {
  const deg = degreeMap(g);
  const max = Math.max(0, ...deg.values());
  return g.vertices.map((v) => {
    const inc = g.incidentEdges(v);
    const loops = inc.filter((e) => e.u === e.v).length;
    const degree = deg.get(v) ?? 0;
    return {
      vertex: v,
      simpleEdges: inc.length - loops,
      loops,
      degree,
      parity: degree % 2 === 0 ? 'par' : 'impar',
      isMax: degree === max && max > 0,
    };
  });
}
