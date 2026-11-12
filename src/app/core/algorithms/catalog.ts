import { MultiGraph } from '../graph-engine/multigraph';
import { adjacencyList, adjacencyMatrix } from './adjacency';
import { findChains } from './backtracking';
import { bfs } from './bfs';
import { connectedComponents } from './components';
import { degreeMap } from './degree';
import { dfs } from './dfs';
import { analyzeEuler } from './euler';
import { fleury } from './fleury';
import { hierholzer } from './hierholzer';
import { validateTileSequence } from './sequence';
import { generateTileSet, parseTiles } from './tiles';

export interface AlgorithmInfo {
  readonly id: string;
  readonly name: string;
  readonly file: string;
  readonly priority: 'obligatorio' | 'complementario';
  readonly description: string;
  readonly inputs: string;
  readonly outputs: string;
  readonly time: string;
  readonly space: string;
  readonly validations: string;
  readonly tests: string;
  /** Ejemplo ejecutado en vivo con el motor. */
  readonly example: () => string;
}

const sample = () => MultiGraph.fromTiles(parseTiles('0-1, 0-2, 1-2, 2-3, 3-3'));

/** Ficha técnica de cada algoritmo implementado (descripción, E/S, complejidad, pruebas). */
export const ALGORITHMS: readonly AlgorithmInfo[] = [
  { id: 'tiles', name: 'Generación de fichas', file: 'core/algorithms/tiles.ts', priority: 'obligatorio',
    description: 'Genera cada ficha una sola vez recorriendo 0 ≤ a ≤ b ≤ n.', inputs: 'n (valor máximo, 6 en el doble-seis).', outputs: 'Lista de (n+1)(n+2)/2 fichas con id único.',
    time: 'O(n²)', space: 'O(n²)', validations: 'n entero entre 0 y 18.', tests: 'Prueba 1 y 2: 28 fichas, 7 dobles, doble-nueve = 55.',
    example: () => { const t = generateTileSet(6); return `${t.length} fichas, ${t.filter((x) => x.a === x.b).length} dobles; primeras: ${t.slice(0, 5).map((x) => x.id).join(', ')}…`; } },
  { id: 'multigraph', name: 'Construcción del multigrafo', file: 'core/graph-engine/multigraph.ts', priority: 'obligatorio',
    description: 'Multigrafo no dirigido inmutable con bucles y aristas paralelas; cada arista conserva su id.', inputs: 'Fichas o lista de vértices/aristas.', outputs: 'Instancia MultiGraph con incidencias indexadas.',
    time: 'O(|V| + |E|) al construir', space: 'O(|V| + |E|)', validations: 'Ids de arista únicos; vértices enteros ≥ 0; al borrar un vértice se borran sus aristas.', tests: 'Prueba 4: aristas paralelas 1-3 y 1-3#2.',
    example: () => { const g = MultiGraph.fromTiles(parseTiles('1-3, 1-3, 3-3')); return `aristas: ${g.edges.map((e) => e.id).join(', ')} · grado(3) = ${g.degree(3)}`; } },
  { id: 'matrix', name: 'Matriz de adyacencia', file: 'core/algorithms/adjacency.ts', priority: 'obligatorio',
    description: 'A[i][j] = nº de aristas i–j; A[i][i] = nº de bucles. grado(i) = Σ fila + A[i][i].', inputs: 'MultiGraph.', outputs: 'Etiquetas y matriz |V|×|V|.',
    time: 'O(|V|² + |E|)', space: 'O(|V|²)', validations: 'Simetría; la diagonal cuenta bucles, no su aporte al grado.', tests: 'Prueba 5.',
    example: () => adjacencyMatrix(sample()).matrix.map((r) => `[${r.join(' ')}]`).join(' ') },
  { id: 'list', name: 'Lista de adyacencia', file: 'core/algorithms/adjacency.ts', priority: 'obligatorio',
    description: 'Para cada vértice, sus conexiones con el id de la ficha (paralelas por separado).', inputs: 'MultiGraph.', outputs: 'Filas {vértice, entradas}.',
    time: 'O(|V| + |E|)', space: 'O(|V| + |E|)', validations: 'Conserva la identidad de cada arista.', tests: 'Prueba 5.',
    example: () => adjacencyList(sample()).map((r) => `${r.vertex}: ${r.entries.map((e) => e.neighbor).join(',')}`).join(' · ') },
  { id: 'degree', name: 'Cálculo de grados', file: 'core/algorithms/degree.ts', priority: 'obligatorio',
    description: 'Cuenta aristas incidentes; cada bucle suma 2. Incluye el teorema del apretón de manos.', inputs: 'MultiGraph.', outputs: 'Mapa vértice → grado, tabla y verificación Σ = 2|E|.',
    time: 'O(|V| + |E|)', space: 'O(|V|)', validations: 'Σ grados = 2|E|.', tests: 'Prueba 3.',
    example: () => [...degreeMap(sample())].map(([v, d]) => `g(${v})=${d}`).join(', ') },
  { id: 'bfs', name: 'BFS (búsqueda en anchura)', file: 'core/algorithms/bfs.ts', priority: 'obligatorio',
    description: 'Explora por niveles con una cola; registra pasos, distancias y árbol BFS.', inputs: 'MultiGraph y vértice inicial.', outputs: 'Orden, distancias, aristas del árbol, no alcanzables y pasos.',
    time: 'O(|V| + |E|)', space: 'O(|V|)', validations: 'El vértice inicial debe existir.', tests: 'Prueba 6.',
    example: () => `desde 0: ${bfs(sample(), 0).order.join(' → ')}` },
  { id: 'dfs', name: 'DFS (búsqueda en profundidad)', file: 'core/algorithms/dfs.ts', priority: 'obligatorio',
    description: 'Avanza en profundidad con una pila explícita y retrocede al agotar vecinos.', inputs: 'MultiGraph y vértice inicial.', outputs: 'Orden, árbol DFS, no alcanzables y pasos (incluye retrocesos).',
    time: 'O(|V| + |E|)', space: 'O(|V|)', validations: 'El vértice inicial debe existir.', tests: 'Prueba 6.',
    example: () => `desde 0: ${dfs(sample(), 0).order.join(' → ')}` },
  { id: 'components', name: 'Componentes conexas', file: 'core/algorithms/components.ts', priority: 'obligatorio',
    description: 'Agrupa vértices alcanzables entre sí; distingue componentes con aristas.', inputs: 'MultiGraph.', outputs: 'Lista de componentes.',
    time: 'O(|V| + |E|)', space: 'O(|V|)', validations: 'Los vértices aislados son componentes propias.', tests: 'Prueba 6.',
    example: () => connectedComponents(MultiGraph.fromTiles(parseTiles('0-1, 2-3'), [0, 1, 2, 3, 4])).map((c) => `{${c.join(',')}}`).join(' ') },
  { id: 'euler', name: 'Validación euleriana', file: 'core/algorithms/euler.ts', priority: 'obligatorio',
    description: 'Comprueba paridad de grados y conectividad del subgrafo con aristas, y explica el resultado.', inputs: 'MultiGraph.', outputs: 'Tipo (circuito / camino / ninguno), impares, inicio/fin y razones.',
    time: 'O(|V| + |E|)', space: 'O(|V|)', validations: 'Ignora vértices aislados; exige una componente con aristas.', tests: 'Pruebas 7, 8 y 9.',
    example: () => `${analyzeEuler(sample()).kind} · impares: ${analyzeEuler(sample()).oddVertices.join(', ')}` },
  { id: 'hierholzer', name: 'Hierholzer', file: 'core/algorithms/hierholzer.ts', priority: 'obligatorio',
    description: 'Construye el camino/circuito euleriano con una pila, empalmando subciclos. Valida el resultado antes de devolverlo.', inputs: 'MultiGraph y vértice inicial opcional.', outputs: 'Secuencia de vértices y fichas, pasos y validación.',
    time: 'O(|E|) (+ ordenamiento de incidencias)', space: 'O(|E|)', validations: 'Todas las aristas, sin repetir, consecutivas, inicio/fin correctos.', tests: 'Prueba 10.',
    example: () => hierholzer(sample())!.trail.vertices.join(' → ') },
  { id: 'sequence', name: 'Validación de secuencias', file: 'core/algorithms/sequence.ts', priority: 'obligatorio',
    description: 'Comprueba que una lista de fichas forma una cadena de dominó válida y la orienta.', inputs: 'MultiGraph y fichas en orden.', outputs: 'Válida/inválida, fichas orientadas, si es cerrada y si usa todas.',
    time: 'O(k)', space: 'O(k)', validations: 'Fichas existentes, sin repetir y encajando con el extremo libre.', tests: 'Caminos, ciclos y secuencias.',
    example: () => { const v = validateTileSequence(sample(), parseTiles('1-0, 0-2, 2-3')); return `${v.valid ? 'válida' : 'inválida'}: ${v.links.map((l) => `${l.from}|${l.to}`).join(' ')}`; } },
  { id: 'fleury', name: 'Fleury', file: 'core/algorithms/fleury.ts', priority: 'complementario',
    description: 'Elige en cada paso una arista que no sea puente salvo que no haya otra. Uso didáctico.', inputs: 'MultiGraph y vértice inicial opcional.', outputs: 'Recorrido y pasos con candidatas y puentes.',
    time: 'O(|E|²)', space: 'O(|V| + |E|)', validations: 'Mismo validador que Hierholzer.', tests: 'Prueba 10 (Fleury y puentes).',
    example: () => fleury(sample())!.trail.vertices.join(' → ') },
  { id: 'backtracking', name: 'Backtracking', file: 'core/algorithms/backtracking.ts', priority: 'complementario',
    description: 'Coloca fichas compatibles y retrocede en callejones sin salida; busca cadenas de longitud dada o que usen todas.', inputs: 'MultiGraph, inicio, modo y límites.', outputs: 'Soluciones, nodos explorados, retrocesos y pasos.',
    time: 'Exponencial O(b^k), acotado por límites', space: 'O(k)', validations: 'Límite de soluciones y de nodos para no bloquear la interfaz.', tests: 'Backtracking en Caminos, ciclos y secuencias.',
    example: () => `${findChains(sample(), 0, { mode: 'all' }).solutions.length} secuencias eulerianas desde 0` },
  { id: 'minimax', name: 'Minimax con poda alfa-beta', file: 'core/game-engine/ai.ts', priority: 'complementario',
    description: 'Nivel experto de la IA: busca 4 jugadas adelante sobre varias manos plausibles del rival y poda ramas que no pueden mejorar.', inputs: 'Estado de la partida.', outputs: 'Jugada elegida con puntuaciones.',
    time: 'O(b^d) peor caso; la poda reduce el promedio', space: 'O(d)', validations: 'Solo considera jugadas legales del motor de juego.', tests: 'IA heurística: prefiere ganar cuando puede.',
    example: () => 'Ver el nivel "Experto" en Jugar → Reglas.' },
];
