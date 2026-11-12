import { GraphData, GraphEdge, Tile, VertexId } from '../models/graph.models';

/**
 * Multigrafo no dirigido inmutable.
 *
 * - Admite bucles (u === v) y aristas paralelas.
 * - Cada arista conserva un identificador único (la ficha que representa).
 * - No asume un conjunto fijo de vértices: sirve para doble-seis, doble-nueve
 *   o cualquier grafo personalizado.
 *
 * Todas las operaciones de modificación devuelven una nueva instancia, lo que
 * facilita el uso con signals y la comparación entre configuraciones.
 */
export class MultiGraph {
  private readonly incidence: ReadonlyMap<VertexId, readonly GraphEdge[]>;

  private constructor(
    readonly vertices: readonly VertexId[],
    readonly edges: readonly GraphEdge[],
  ) {
    const inc = new Map<VertexId, GraphEdge[]>();
    for (const v of vertices) inc.set(v, []);
    for (const e of edges) {
      inc.get(e.u)?.push(e);
      if (e.u !== e.v) inc.get(e.v)?.push(e);
    }
    this.incidence = inc;
  }

  // ---------------------------------------------------------------- creación

  static empty(): MultiGraph {
    return new MultiGraph([], []);
  }

  static withVertices(vertices: Iterable<VertexId>): MultiGraph {
    return new MultiGraph(uniqueSorted(vertices), []);
  }

  /** Construye el multigrafo de un conjunto de fichas: cada ficha es una arista. */
  static fromTiles(tiles: readonly Tile[], vertices?: Iterable<VertexId>): MultiGraph {
    const vs = new Set<VertexId>(vertices ?? []);
    for (const t of tiles) {
      vs.add(t.a);
      vs.add(t.b);
    }
    const ids = new Set<string>();
    const edges = tiles.map((t) => {
      if (ids.has(t.id)) throw new Error(`Identificador de ficha duplicado: ${t.id}`);
      ids.add(t.id);
      return { id: t.id, u: Math.min(t.a, t.b), v: Math.max(t.a, t.b) };
    });
    return new MultiGraph(uniqueSorted(vs), edges);
  }

  static fromData(data: GraphData): MultiGraph {
    let g = MultiGraph.withVertices(data.vertices);
    for (const e of data.edges) g = g.addEdge(e.u, e.v, e.id);
    return g;
  }

  // ---------------------------------------------------------------- consultas

  get order(): number {
    return this.vertices.length;
  }

  get size(): number {
    return this.edges.length;
  }

  hasVertex(v: VertexId): boolean {
    return this.incidence.has(v);
  }

  edge(id: string): GraphEdge | undefined {
    return this.edges.find((e) => e.id === id);
  }

  /** Aristas incidentes a v (un bucle aparece una sola vez). */
  incidentEdges(v: VertexId): readonly GraphEdge[] {
    return this.incidence.get(v) ?? [];
  }

  /** Vecinos de v sin repetición (v se incluye si tiene bucle). */
  neighbors(v: VertexId): VertexId[] {
    const out = new Set<VertexId>();
    for (const e of this.incidentEdges(v)) out.add(other(e, v));
    return [...out].sort((a, b) => a - b);
  }

  /** Grado de v: aristas incidentes, contando cada bucle dos veces. */
  degree(v: VertexId): number {
    let d = 0;
    for (const e of this.incidentEdges(v)) d += e.u === e.v ? 2 : 1;
    return d;
  }

  loops(): GraphEdge[] {
    return this.edges.filter(isLoop);
  }

  /** Grupos de aristas que unen el mismo par de vértices (solo grupos con 2 o más). */
  parallelGroups(): GraphEdge[][] {
    const groups = new Map<string, GraphEdge[]>();
    for (const e of this.edges) {
      const k = pairKey(e.u, e.v);
      groups.set(k, [...(groups.get(k) ?? []), e]);
    }
    return [...groups.values()].filter((g) => g.length > 1);
  }

  /** Número de aristas "extra" paralelas (una arista repetida dos veces cuenta 1). */
  parallelEdgeCount(): number {
    return this.parallelGroups().reduce((acc, g) => acc + g.length, 0);
  }

  edgesBetween(u: VertexId, v: VertexId): GraphEdge[] {
    return this.incidentEdges(u).filter((e) => other(e, u) === v);
  }

  toData(): GraphData {
    return { vertices: [...this.vertices], edges: this.edges.map((e) => ({ ...e })) };
  }

  // ---------------------------------------------------------------- modificación

  addVertex(v: VertexId): MultiGraph {
    if (!Number.isInteger(v) || v < 0) throw new Error('El vértice debe ser un entero no negativo.');
    if (this.hasVertex(v)) return this;
    return new MultiGraph(uniqueSorted([...this.vertices, v]), this.edges);
  }

  /**
   * Elimina un vértice. Decisión explícita: las aristas incidentes también se
   * eliminan, porque una arista no puede existir sin sus dos extremos.
   */
  removeVertex(v: VertexId): MultiGraph {
    if (!this.hasVertex(v)) return this;
    return new MultiGraph(
      this.vertices.filter((x) => x !== v),
      this.edges.filter((e) => e.u !== v && e.v !== v),
    );
  }

  /**
   * Agrega una arista u–v. Si no se indica id, se usa la etiqueta de ficha
   * "min-max" y, si ya existe, se añade un sufijo (#2, #3…) para conservar
   * la identidad de cada arista paralela.
   */
  addEdge(u: VertexId, v: VertexId, id?: string): MultiGraph {
    let g: MultiGraph = this;
    if (!g.hasVertex(u)) g = g.addVertex(u);
    if (!g.hasVertex(v)) g = g.addVertex(v);
    const a = Math.min(u, v);
    const b = Math.max(u, v);
    const finalId = id ?? g.nextEdgeId(a, b);
    if (g.edge(finalId)) throw new Error(`Ya existe una arista con id ${finalId}`);
    return new MultiGraph(g.vertices, [...g.edges, { id: finalId, u: a, v: b }]);
  }

  removeEdge(id: string): MultiGraph {
    if (!this.edge(id)) return this;
    return new MultiGraph(this.vertices, this.edges.filter((e) => e.id !== id));
  }

  /** Genera un id libre para una nueva arista a–b. */
  nextEdgeId(a: VertexId, b: VertexId): string {
    const base = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (!this.edge(base)) return base;
    let k = 2;
    while (this.edge(`${base}#${k}`)) k++;
    return `${base}#${k}`;
  }
}

// ------------------------------------------------------------------ utilidades

export function isLoop(e: GraphEdge): boolean {
  return e.u === e.v;
}

/** Extremo opuesto de la arista e respecto de v. */
export function other(e: GraphEdge, v: VertexId): VertexId {
  return e.u === v ? e.v : e.u;
}

export function pairKey(u: VertexId, v: VertexId): string {
  return `${Math.min(u, v)}|${Math.max(u, v)}`;
}

function uniqueSorted(vs: Iterable<VertexId>): VertexId[] {
  return [...new Set(vs)].sort((a, b) => a - b);
}
