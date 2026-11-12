import { MultiGraph, other } from '../graph-engine/multigraph';
import { VertexId } from '../models/graph.models';
import { sortedIncident } from './traversal-utils';

/** Ficha orientada dentro de una cadena: se lee de `from` a `to`. */
export interface ChainLink {
  readonly edgeId: string;
  readonly from: VertexId;
  readonly to: VertexId;
}

export interface BacktrackStep {
  readonly kind: 'place' | 'backtrack' | 'solution' | 'dead-end';
  readonly depth: number;
  readonly chain: readonly string[];
  readonly message: string;
}

export interface BacktrackOptions {
  /** 'all' = usar todas las fichas (secuencia euleriana); 'length' = cadenas de longitud exacta. */
  readonly mode: 'all' | 'length';
  readonly targetLength?: number;
  readonly maxSolutions?: number;
  /** Presupuesto de nodos explorados, para no bloquear la interfaz. */
  readonly maxNodes?: number;
  /** Pasos que se registran para la visualización. */
  readonly maxLoggedSteps?: number;
}

export interface BacktrackResult {
  readonly solutions: readonly (readonly ChainLink[])[];
  readonly steps: readonly BacktrackStep[];
  readonly explored: number;
  readonly backtracks: number;
  readonly truncated: boolean;
  readonly target: number;
}

/**
 * Búsqueda por backtracking de cadenas de dominó que comienzan en `start`.
 * Coloca una ficha compatible con el extremo actual, avanza, y si llega a un
 * punto sin salida antes de la meta, retira la última ficha y prueba otra.
 *
 * - mode 'all': busca secuencias que usan TODAS las fichas (recorridos eulerianos).
 * - mode 'length': busca cadenas válidas de una longitud dada (subconjunto de fichas).
 *
 * Complejidad: exponencial en el peor caso, O(b^k); se acota con maxNodes y maxSolutions.
 */
export function findChains(g: MultiGraph, start: VertexId, opts: BacktrackOptions): BacktrackResult {
  const target = opts.mode === 'all' ? g.size : Math.min(opts.targetLength ?? 3, g.size);
  const maxSolutions = opts.maxSolutions ?? 10;
  const maxNodes = opts.maxNodes ?? 200_000;
  const maxLogged = opts.maxLoggedSteps ?? 400;
  const used = new Set<string>();
  const chain: ChainLink[] = [];
  const solutions: ChainLink[][] = [];
  const steps: BacktrackStep[] = [];
  const incident = new Map(g.vertices.map((v) => [v, sortedIncident(g, v)]));
  let explored = 0;
  let backtracks = 0;
  let truncated = false;

  const log = (kind: BacktrackStep['kind'], message: string): void => {
    if (steps.length < maxLogged) steps.push({ kind, depth: chain.length, chain: chain.map(linkLabel), message });
  };

  const search = (at: VertexId): boolean => {
    if (chain.length === target) {
      solutions.push([...chain]);
      log('solution', `Solución ${solutions.length}: ${chain.map(linkLabel).join(' ')}`);
      return solutions.length >= maxSolutions;
    }
    let placed = false;
    for (const e of incident.get(at) ?? []) {
      if (used.has(e.id)) continue;
      if (++explored > maxNodes) {
        truncated = true;
        return true;
      }
      placed = true;
      const to = other(e, at);
      used.add(e.id);
      chain.push({ edgeId: e.id, from: at, to });
      log('place', `Se coloca ${at}|${to} (ficha ${e.id}); extremo libre: ${to}.`);
      if (search(to)) return true;
      chain.pop();
      used.delete(e.id);
      backtracks++;
      log('backtrack', `Se retira la ficha ${e.id} y se prueba otra opción desde ${at}.`);
    }
    if (!placed) log('dead-end', `Sin fichas compatibles con ${at}: callejón sin salida con ${chain.length} de ${target} fichas.`);
    return false;
  };

  if (g.hasVertex(start) && target > 0) search(start);
  return { solutions, steps, explored, backtracks, truncated, target };
}

export function linkLabel(l: ChainLink): string {
  return `${l.from}|${l.to}`;
}
