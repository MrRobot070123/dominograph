import { MultiGraph } from '../graph-engine/multigraph';
import { EulerAnalysis, VertexId } from '../models/graph.models';
import { edgeComponents } from './components';
import { degreeMap } from './degree';

/**
 * Validación euleriana de un multigrafo no dirigido.
 *
 * Con al menos una arista y todos los vértices de grado positivo en una misma
 * componente conexa:
 *   - 0 vértices de grado impar  → existe circuito euleriano.
 *   - 2 vértices de grado impar  → existe camino euleriano abierto entre ellos.
 *   - más de 2 vértices impares  → no existe recorrido euleriano.
 * Los vértices aislados (grado 0) no afectan el resultado.
 *
 * Complejidad: O(|V| + |E|).
 */
export function analyzeEuler(g: MultiGraph): EulerAnalysis {
  const degrees = degreeMap(g);
  const odd = [...degrees].filter(([, d]) => d % 2 === 1).map(([v]) => v);
  const isolated = [...degrees].filter(([, d]) => d === 0).map(([v]) => v);
  const comps = edgeComponents(g);
  const reasons: string[] = [];
  const base = { oddVertices: odd, degrees, edgeComponents: comps.length, isolatedVertices: isolated };

  if (g.size === 0) {
    reasons.push('El grafo no tiene aristas: no hay fichas que recorrer.');
    return { ...base, kind: 'empty', edgesConnected: false, start: null, end: null, reasons };
  }

  reasons.push(`Grados: ${[...degrees].map(([v, d]) => `grado(${v}) = ${d}`).join(', ')}.`);
  reasons.push(odd.length === 0 ? 'Todos los vértices tienen grado par.' : `Vértices de grado impar (${odd.length}): ${odd.join(', ')}.`);
  if (isolated.length) reasons.push(`Vértices aislados ${isolated.join(', ')}: no tienen aristas y no impiden el recorrido.`);

  const edgesConnected = comps.length === 1;
  if (!edgesConnected) {
    reasons.push(`Las aristas están repartidas en ${comps.length} componentes conexas (${comps.map((c) => `{${c.join(', ')}}`).join(', ')}). Un recorrido no puede saltar de una componente a otra, así que no existe recorrido euleriano.`);
    return { ...base, kind: 'none', edgesConnected, start: null, end: null, reasons };
  }
  reasons.push('Todos los vértices con aristas pertenecen a una misma componente conexa.');

  if (odd.length === 0) {
    const start = firstWithEdges(g, degrees);
    reasons.push('Conexo y sin vértices impares ⇒ existe un circuito euleriano: se puede usar cada ficha exactamente una vez y volver al vértice inicial.');
    return { ...base, kind: 'circuit', edgesConnected, start, end: start, reasons };
  }
  if (odd.length === 2) {
    reasons.push(`Conexo y con exactamente dos vértices impares ⇒ existe un camino euleriano abierto que empieza en ${odd[0]} y termina en ${odd[1]} (o al revés).`);
    return { ...base, kind: 'path', edgesConnected, start: odd[0], end: odd[1], reasons };
  }
  reasons.push(`Hay ${odd.length} vértices impares. En un recorrido, cada paso por un vértice intermedio usa dos aristas (entra y sale), por lo que solo el inicio y el final pueden tener grado impar. Con más de dos impares no existe recorrido euleriano.`);
  return { ...base, kind: 'none', edgesConnected, start: null, end: null, reasons };
}

function firstWithEdges(g: MultiGraph, degrees: Map<VertexId, number>): VertexId | null {
  return g.vertices.find((v) => (degrees.get(v) ?? 0) > 0) ?? null;
}
