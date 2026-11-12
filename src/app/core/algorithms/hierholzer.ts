import { MultiGraph, other } from '../graph-engine/multigraph';
import { Trail, ValidationResult, VertexId } from '../models/graph.models';
import { analyzeEuler } from './euler';
import { sortedIncident } from './traversal-utils';

export interface HierholzerStep {
  readonly kind: 'advance' | 'retreat';
  readonly vertex: VertexId;
  readonly edgeId?: string;
  /** Pila de vértices después del paso. */
  readonly stack: readonly VertexId[];
  /** Fragmento del recorrido final ya fijado (en orden inverso de construcción). */
  readonly fixed: readonly VertexId[];
  readonly message: string;
}

export interface HierholzerResult {
  readonly trail: Trail;
  readonly steps: readonly HierholzerStep[];
  readonly validation: ValidationResult;
}

/**
 * Algoritmo de Hierholzer (versión iterativa con pila).
 *
 * Avanza por aristas no usadas hasta quedar atascado; al no haber salida,
 * fija el vértice en el recorrido y retrocede. Los subciclos encontrados al
 * retroceder quedan empalmados automáticamente en el recorrido final.
 *
 * - Trabaja con identificadores de arista: admite bucles y aristas paralelas.
 * - Nunca reutiliza una arista.
 * - Valida el resultado antes de devolverlo.
 *
 * Entrada: multigrafo y vértice inicial opcional.
 * Salida: recorrido (vértices + fichas) o null si no existe.
 * Complejidad: O(|E|) tiempo (más el ordenamiento de incidencias), O(|E|) espacio.
 */
export function hierholzer(g: MultiGraph, preferredStart?: VertexId): HierholzerResult | null {
  const analysis = analyzeEuler(g);
  if (analysis.kind === 'none' || analysis.kind === 'empty') return null;

  let start = analysis.start!;
  if (preferredStart !== undefined && g.degree(preferredStart) > 0) {
    if (analysis.kind === 'circuit' || analysis.oddVertices.includes(preferredStart)) start = preferredStart;
  }

  const used = new Set<string>();
  const pointer = new Map<VertexId, number>();
  const incident = new Map(g.vertices.map((v) => [v, sortedIncident(g, v)]));
  const stack: { v: VertexId; via?: string }[] = [{ v: start }];
  const circuitV: VertexId[] = [];
  const circuitE: string[] = [];
  const steps: HierholzerStep[] = [];

  while (stack.length) {
    const top = stack[stack.length - 1];
    const list = incident.get(top.v)!;
    let i = pointer.get(top.v) ?? 0;
    while (i < list.length && used.has(list[i].id)) i++;
    pointer.set(top.v, i);
    if (i < list.length) {
      const e = list[i];
      used.add(e.id);
      const w = other(e, top.v);
      stack.push({ v: w, via: e.id });
      steps.push({ kind: 'advance', vertex: w, edgeId: e.id, stack: stack.map((s) => s.v), fixed: [...circuitV], message: `Desde ${top.v} se usa la ficha ${e.id} y se avanza a ${w}.` });
    } else {
      stack.pop();
      circuitV.push(top.v);
      if (top.via) circuitE.push(top.via);
      steps.push({ kind: 'retreat', vertex: top.v, edgeId: top.via, stack: stack.map((s) => s.v), fixed: [...circuitV], message: `${top.v} no tiene fichas libres: se fija en el recorrido y se retrocede.` });
    }
  }

  const trail: Trail = {
    vertices: circuitV.reverse(),
    edges: circuitE.reverse(),
    closed: analysis.kind === 'circuit',
  };
  return { trail, steps, validation: validateEulerTrail(g, trail) };
}

/**
 * Valida matemáticamente un recorrido euleriano:
 *  1. usa todas las aristas, 2. no repite ninguna, 3. aristas consecutivas
 *  comparten el vértice correspondiente, 4. inicio/fin coherentes con su tipo.
 */
export function validateEulerTrail(g: MultiGraph, t: Trail): ValidationResult {
  const errors: string[] = [];
  if (t.vertices.length !== t.edges.length + 1) errors.push('La secuencia de vértices debe tener una posición más que la de aristas.');
  const seen = new Set<string>();
  t.edges.forEach((id, k) => {
    const e = g.edge(id);
    if (!e) {
      errors.push(`La arista ${id} no existe en el grafo.`);
      return;
    }
    if (seen.has(id)) errors.push(`La arista ${id} se repite.`);
    seen.add(id);
    const a = t.vertices[k];
    const b = t.vertices[k + 1];
    const ok = (e.u === a && e.v === b) || (e.v === a && e.u === b);
    if (!ok) errors.push(`La arista ${id} no une ${a} con ${b}.`);
  });
  if (seen.size !== g.size) errors.push(`Se usaron ${seen.size} de ${g.size} aristas.`);
  const first = t.vertices[0];
  const last = t.vertices[t.vertices.length - 1];
  if (t.closed && first !== last) errors.push('Un circuito debe terminar en el vértice inicial.');
  if (!t.closed && first === last && g.size > 0) errors.push('Un camino abierto no debería terminar donde empezó.');
  return { valid: errors.length === 0, errors };
}
