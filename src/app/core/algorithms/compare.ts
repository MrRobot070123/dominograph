import { MultiGraph } from '../graph-engine/multigraph';
import { EulerKind, VertexId } from '../models/graph.models';
import { connectedComponents } from './components';
import { degreeMap, oddVertices } from './degree';
import { analyzeEuler } from './euler';

export interface GraphComparison {
  readonly verticesOnlyA: readonly VertexId[];
  readonly verticesOnlyB: readonly VertexId[];
  /** Aristas por par de extremos (multiconjunto): las que sobran en A o en B. */
  readonly edgesOnlyA: readonly string[];
  readonly edgesOnlyB: readonly string[];
  readonly degreeChanges: readonly { vertex: VertexId; a: number; b: number }[];
  readonly components: { readonly a: number; readonly b: number };
  readonly oddCount: { readonly a: number; readonly b: number };
  readonly euler: { readonly a: EulerKind; readonly b: EulerKind };
  readonly summary: readonly string[];
}

/** Compara dos configuraciones de fichas. Complejidad: O(|V| + |E|). */
export function compareGraphs(a: MultiGraph, b: MultiGraph): GraphComparison {
  const va = new Set(a.vertices);
  const vb = new Set(b.vertices);
  const ka = edgeMultiset(a);
  const kb = edgeMultiset(b);
  const edgesOnlyA: string[] = [];
  const edgesOnlyB: string[] = [];
  for (const k of new Set([...ka.keys(), ...kb.keys()])) {
    const d = (ka.get(k) ?? 0) - (kb.get(k) ?? 0);
    for (let i = 0; i < Math.abs(d); i++) (d > 0 ? edgesOnlyA : edgesOnlyB).push(k);
  }
  const da = degreeMap(a);
  const db = degreeMap(b);
  const all = [...new Set([...va, ...vb])].sort((x, y) => x - y);
  const degreeChanges = all
    .map((v) => ({ vertex: v, a: da.get(v) ?? 0, b: db.get(v) ?? 0 }))
    .filter((r) => r.a !== r.b);
  const ea = analyzeEuler(a).kind;
  const eb = analyzeEuler(b).kind;
  const ca = connectedComponents(a).length;
  const cb = connectedComponents(b).length;
  const oa = oddVertices(a).length;
  const ob = oddVertices(b).length;
  const names: Record<EulerKind, string> = { circuit: 'circuito euleriano', path: 'camino euleriano', none: 'sin recorrido euleriano', empty: 'sin aristas' };
  const summary = [
    `Aristas: ${a.size} → ${b.size}.`,
    `Componentes conexas: ${ca} → ${cb}.`,
    `Vértices de grado impar: ${oa} → ${ob}.`,
    `Euler: ${names[ea]} → ${names[eb]}.`,
  ];
  if (degreeChanges.length) summary.push(`Cambian de grado: ${degreeChanges.map((d) => `${d.vertex} (${d.a}→${d.b})`).join(', ')}.`);
  return {
    verticesOnlyA: a.vertices.filter((v) => !vb.has(v)),
    verticesOnlyB: b.vertices.filter((v) => !va.has(v)),
    edgesOnlyA, edgesOnlyB, degreeChanges,
    components: { a: ca, b: cb },
    oddCount: { a: oa, b: ob },
    euler: { a: ea, b: eb },
    summary,
  };
}

function edgeMultiset(g: MultiGraph): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of g.edges) {
    const k = `${e.u}-${e.v}`;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}
