import { MultiGraph } from '../graph-engine/multigraph';
import { VertexId } from '../models/graph.models';

export type WalkType =
  | 'invalido'
  | 'trivial'
  | 'camino'
  | 'camino-sin-aristas-repetidas'
  | 'camino-simple'
  | 'circuito'
  | 'ciclo';

export interface WalkAnalysis {
  readonly valid: boolean;
  readonly type: WalkType;
  readonly title: string;
  readonly vertices: readonly VertexId[];
  readonly edges: readonly string[];
  readonly closed: boolean;
  readonly repeatedVertices: readonly VertexId[];
  readonly repeatedEdges: readonly string[];
  readonly eulerian: boolean;
  readonly explanation: readonly string[];
}

/**
 * Analiza una secuencia de vértices elegida por el usuario.
 *
 * Para cada par consecutivo se busca una arista que los una, priorizando
 * aristas aún no usadas (así, con aristas paralelas, se aprovechan las
 * distintas copias). Luego se clasifica:
 *  - camino (recorrido): cualquier secuencia de aristas consecutivas;
 *  - camino sin aristas repetidas: no repite aristas;
 *  - camino simple: no repite vértices;
 *  - circuito: cerrado y sin aristas repetidas;
 *  - ciclo: circuito que no repite vértices (salvo inicio = fin).
 * Complejidad: O(k · grado máximo) para una secuencia de k vértices.
 */
export function analyzeWalk(g: MultiGraph, seq: readonly VertexId[], fixedEdges?: readonly string[]): WalkAnalysis {
  const explanation: string[] = [];
  const invalid = (msg: string): WalkAnalysis => ({
    valid: false, type: 'invalido', title: 'Secuencia no válida', vertices: seq, edges: [], closed: false,
    repeatedVertices: [], repeatedEdges: [], eulerian: false, explanation: [msg],
  });
  if (seq.length === 0) return invalid('Selecciona al menos un vértice.');
  for (const v of seq) if (!g.hasVertex(v)) return invalid(`El vértice ${v} no existe en el grafo.`);

  const edges: string[] = [];
  const useCount = new Map<string, number>();
  for (let k = 0; k + 1 < seq.length; k++) {
    const a = seq[k];
    const b = seq[k + 1];
    let id = fixedEdges?.[k];
    if (id !== undefined) {
      const e = g.edge(id);
      if (!e || !((e.u === a && e.v === b) || (e.u === b && e.v === a))) return invalid(`La arista ${id} no une ${a} con ${b}.`);
    } else {
      const between = g.edgesBetween(a, b);
      if (between.length === 0) return invalid(`No hay ninguna ficha que una ${a} con ${b}: la secuencia se interrumpe.`);
      id = (between.find((e) => !useCount.has(e.id)) ?? between[0]).id;
    }
    edges.push(id);
    useCount.set(id, (useCount.get(id) ?? 0) + 1);
  }

  const closed = seq.length > 1 && seq[0] === seq[seq.length - 1];
  const repeatedEdges = [...useCount].filter(([, n]) => n > 1).map(([id]) => id);
  const body = closed ? seq.slice(0, -1) : seq;
  const counts = new Map<VertexId, number>();
  for (const v of body) counts.set(v, (counts.get(v) ?? 0) + 1);
  const repeatedVertices = [...counts].filter(([, n]) => n > 1).map(([v]) => v);
  const eulerian = repeatedEdges.length === 0 && useCount.size === g.size && g.size > 0;

  explanation.push(`Aristas utilizadas: ${edges.length ? edges.join(' → ') : 'ninguna'}.`);
  explanation.push(repeatedEdges.length ? `Repite las aristas ${repeatedEdges.join(', ')}.` : 'No repite aristas.');
  explanation.push(repeatedVertices.length ? `Repite los vértices ${repeatedVertices.join(', ')}${closed ? ' (sin contar el regreso al inicio)' : ''}.` : 'No repite vértices' + (closed ? ' salvo el regreso al inicio.' : '.'));

  let type: WalkType;
  let title: string;
  if (seq.length === 1) {
    type = 'trivial';
    title = 'Camino trivial';
    explanation.push('Un solo vértice y ninguna arista: es un camino de longitud 0.');
  } else if (closed && repeatedEdges.length === 0 && repeatedVertices.length === 0) {
    type = 'ciclo';
    title = 'Ciclo';
    explanation.push('Es cerrado, no repite aristas y solo repite el vértice inicial al final: es un ciclo (y también un circuito).');
  } else if (closed && repeatedEdges.length === 0) {
    type = 'circuito';
    title = 'Circuito';
    explanation.push('Es cerrado y no repite aristas, pero pasa más de una vez por algún vértice: es un circuito, no un ciclo.');
  } else if (!closed && repeatedVertices.length === 0) {
    type = 'camino-simple';
    title = 'Camino simple';
    explanation.push('Es abierto y no repite vértices (por tanto tampoco aristas): es un camino simple.');
  } else if (repeatedEdges.length === 0) {
    type = 'camino-sin-aristas-repetidas';
    title = 'Camino sin aristas repetidas';
    explanation.push('No repite aristas pero sí vértices: es un recorrido válido, no un camino simple.');
  } else {
    type = 'camino';
    title = closed ? 'Camino cerrado con aristas repetidas' : 'Camino con aristas repetidas';
    explanation.push('Repite aristas: es un camino válido en el grafo, pero no es circuito, ni ciclo, ni recorrido euleriano. En el dominó equivaldría a usar la misma ficha dos veces.');
  }
  explanation.push(`Longitud: ${edges.length} arista(s).`);
  if (eulerian) explanation.push(`Usa las ${g.size} aristas exactamente una vez: es un ${closed ? 'circuito' : 'camino'} euleriano.`);
  else if (repeatedEdges.length === 0 && g.size > 0) explanation.push(`Usa ${useCount.size} de ${g.size} aristas: no es euleriano.`);

  return { valid: true, type, title, vertices: seq, edges, closed, repeatedVertices, repeatedEdges, eulerian, explanation };
}
