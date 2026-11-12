import { findChains } from '../../core/algorithms/backtracking';
import { bfs } from '../../core/algorithms/bfs';
import { connectedComponents } from '../../core/algorithms/components';
import { degreeMap, handshake, oddVertices } from '../../core/algorithms/degree';
import { dfs } from '../../core/algorithms/dfs';
import { analyzeEuler } from '../../core/algorithms/euler';
import { hierholzer } from '../../core/algorithms/hierholzer';
import { validateTileSequence } from '../../core/algorithms/sequence';
import { generateTileSet, parseTiles } from '../../core/algorithms/tiles';
import { analyzeWalk } from '../../core/algorithms/walk';
import { MultiGraph } from '../../core/graph-engine/multigraph';
import { Challenge, ChallengeAnswer, ChallengeCheck, ChallengeLevel } from '../../core/models/challenge.models';
import { VertexId } from '../../core/models/graph.models';

export const LEVELS: readonly ChallengeLevel[] = [
  { level: 1, name: 'Fundamentos', description: 'Vértices, aristas, bucles y aristas paralelas.' },
  { level: 2, name: 'Propiedades', description: 'Grados, paridad y apretón de manos.' },
  { level: 3, name: 'Conectividad', description: 'Grafos conexos, componentes, BFS y DFS.' },
  { level: 4, name: 'Recorridos', description: 'Caminos, ciclos y circuitos.' },
  { level: 5, name: 'Euler', description: 'Condiciones y construcción de recorridos eulerianos.' },
  { level: 6, name: 'Retos avanzados', description: 'Configuraciones complejas, algoritmos y backtracking.' },
];

const STD: VertexId[] = [0, 1, 2, 3, 4, 5, 6];

// ------------------------------------------------------------- validadores reutilizables

const num = (expected: (g: MultiGraph) => number, unit = '') => (g: MultiGraph, a: ChallengeAnswer): ChallengeCheck => {
  const e = expected(g);
  if (a.kind !== 'number') return wrong('Respuesta no válida.');
  return a.value === e ? ok(`Correcto: ${e}${unit}.`) : wrong(`${a.value}${unit} no es correcto. Revisa la explicación e inténtalo de nuevo.`);
};

const choice = (expected: (g: MultiGraph) => string) => (g: MultiGraph, a: ChallengeAnswer): ChallengeCheck => {
  const e = expected(g);
  if (a.kind !== 'choice') return wrong('Respuesta no válida.');
  return a.value === e ? ok(`Correcto: ${e}.`) : wrong(`"${a.value}" no es la respuesta correcta.`);
};

const vset = (expected: (g: MultiGraph) => VertexId[]) => (g: MultiGraph, a: ChallengeAnswer): ChallengeCheck => {
  const e = [...expected(g)].sort((x, y) => x - y);
  if (a.kind !== 'vertex-set') return wrong('Respuesta no válida.');
  const got = [...new Set(a.value)].sort((x, y) => x - y);
  if (got.join() === e.join()) return ok(`Correcto: {${e.join(', ')}}.`);
  const missing = e.filter((v) => !got.includes(v));
  const extra = got.filter((v) => !e.includes(v));
  return wrong(`${missing.length ? `Faltan ${missing.length} vértice(s). ` : ''}${extra.length ? `Sobran: ${extra.join(', ')}.` : ''}`);
};

const order = (expected: (g: MultiGraph) => readonly VertexId[], name: string) => (g: MultiGraph, a: ChallengeAnswer): ChallengeCheck => {
  const e = expected(g);
  if (a.kind !== 'vertex-seq') return wrong('Respuesta no válida.');
  if (a.value.join() === e.join()) return ok(`Correcto: el orden ${name} es ${e.join(' → ')}.`);
  const k = a.value.findIndex((v, i) => v !== e[i]);
  return wrong(k >= 0 ? `La posición ${k + 1} no es correcta.` : `Faltan vértices: el recorrido tiene ${e.length}.`);
};

function ok(feedback: string): ChallengeCheck {
  return { correct: true, feedback };
}
function wrong(feedback: string): ChallengeCheck {
  return { correct: false, feedback };
}
const degreesText = (g: MultiGraph) => [...degreeMap(g)].map(([v, d]) => `grado(${v}) = ${d}`).join(', ');
const eulerName = (g: MultiGraph) => ({ circuit: 'Circuito euleriano', path: 'Camino euleriano abierto', none: 'No existe recorrido euleriano', empty: 'Sin aristas' })[analyzeEuler(g).kind];

// ------------------------------------------------------------- banco de desafíos

export const CHALLENGES: readonly Challenge[] = [
  // ===== Nivel 1 · Fundamentos
  {
    id: 'n1-vertices', level: 1, title: 'Vértices con fichas', kind: 'number', points: 10, seconds: 45,
    tiles: '0-1, 1-2, 2-4, 4-4', vertices: STD,
    statement: 'El grafo tiene los siete vértices del dominó, pero solo se usan algunas fichas.',
    instructions: '¿Cuántos vértices tocan al menos una ficha (tienen grado mayor que 0)?',
    check: num((g) => g.vertices.filter((v) => g.degree(v) > 0).length),
    explain: (g) => [`Cada valor que aparece en alguna ficha es un vértice con aristas: ${g.vertices.filter((v) => g.degree(v) > 0).join(', ')}.`, `Los demás (${g.vertices.filter((v) => g.degree(v) === 0).join(', ')}) son vértices aislados: existen en V pero no tienen aristas.`],
  },
  {
    id: 'n1-aristas', level: 1, title: 'Contar aristas', kind: 'number', points: 10, seconds: 40,
    tiles: '0-0, 0-3, 3-5, 5-5, 1-3',
    statement: 'En el modelo del dominó, cada ficha es exactamente una arista, incluidas las dobles.',
    instructions: '¿Cuántas aristas tiene el grafo?',
    check: num((g) => g.size),
    explain: (g) => [`|E| = número de fichas = ${g.size}.`, `Las dobles (${g.loops().map((e) => e.id).join(', ')}) también son aristas: son bucles, pero cuentan como una arista cada una.`],
  },
  {
    id: 'n1-bucles', level: 1, title: 'Reconocer bucles', kind: 'vertex-set', points: 10, seconds: 40,
    tiles: '1-1, 1-4, 4-6, 6-6, 2-3, 3-3', vertices: STD,
    statement: 'Las fichas dobles se representan como bucles: aristas que salen y llegan al mismo vértice.',
    instructions: 'Haz clic en todos los vértices que tienen un bucle y pulsa Comprobar.',
    check: vset((g) => [...new Set(g.loops().map((e) => e.u))]),
    explain: (g) => [`Fichas dobles: ${g.loops().map((e) => e.id).join(', ')}.`, `Por eso hay bucles en los vértices ${[...new Set(g.loops().map((e) => e.u))].join(', ')}.`],
  },
  {
    id: 'n1-paralelas', level: 1, title: 'Aristas paralelas', kind: 'choice', points: 10, seconds: 40,
    tiles: '1-3, 1-3, 2-4, 2-2, 4-1',
    options: ['1-3', '2-4', '2-2', 'Ninguna'],
    statement: 'En este conjunto personalizado hay una ficha repetida.',
    instructions: '¿Qué par de vértices está unido por aristas paralelas?',
    check: choice((g) => g.parallelGroups()[0]?.[0].id.split('#')[0] ?? 'Ninguna'),
    explain: (g) => [`Aristas entre los mismos vértices: ${g.parallelGroups().map((gr) => gr.map((e) => e.id).join(' y ')).join('; ')}.`, 'Un grafo simple las fusionaría en una sola; el multigrafo conserva cada ficha con su propio identificador.'],
  },

  // ===== Nivel 2 · Propiedades
  {
    id: 'n2-grado', level: 2, title: 'Grado con bucle', kind: 'number', points: 15, seconds: 45,
    tiles: '2-2, 2-3, 2-5, 1-2, 4-5',
    statement: 'El grado de un vértice cuenta las aristas que llegan a él. Un bucle llega dos veces.',
    instructions: '¿Cuál es el grado del vértice 2?',
    check: num((g) => g.degree(2)),
    explain: (g) => {
      const inc = g.incidentEdges(2);
      const loops = inc.filter((e) => e.u === e.v).length;
      return [`Aristas a otros vértices: ${inc.length - loops} (${inc.filter((e) => e.u !== e.v).map((e) => e.id).join(', ')}).`, `Bucles: ${loops} → aportan ${2 * loops}.`, `grado(2) = ${inc.length - loops} + ${2 * loops} = ${g.degree(2)}.`];
    },
  },
  {
    id: 'n2-impares', level: 2, title: 'Vértices impares', kind: 'vertex-set', points: 15, seconds: 50,
    tiles: '0-1, 1-2, 2-3, 3-0, 0-2, 4-4, 4-5', vertices: STD,
    statement: 'La paridad de los grados decide si existe un recorrido euleriano.',
    instructions: 'Selecciona todos los vértices de grado impar.',
    check: vset((g) => oddVertices(g)),
    explain: (g) => [degreesText(g) + '.', `Impares: ${oddVertices(g).join(', ') || 'ninguno'}. Observa que siempre hay una cantidad par de vértices impares.`],
  },
  {
    id: 'n2-apreton', level: 2, title: 'Apretón de manos', kind: 'number', points: 15, seconds: 40,
    tiles: '0-0, 0-1, 1-2, 2-2, 2-6, 3-6, 3-4, 4-5, 5-5',
    statement: 'No necesitas calcular cada grado por separado.',
    instructions: '¿Cuánto vale la suma de los grados de todos los vértices?',
    check: num((g) => handshake(g).degreeSum),
    explain: (g) => [`Teorema del apretón de manos: Σ grado(v) = 2|E| = 2 · ${g.size} = ${handshake(g).degreeSum}.`, 'Cada ficha aporta 2 a la suma: 1 a cada extremo, o 2 al mismo vértice si es doble.'],
  },

  // ===== Nivel 3 · Conectividad
  {
    id: 'n3-conexo', level: 3, title: '¿Es conexo?', kind: 'choice', points: 15, seconds: 40,
    tiles: '0-1, 1-2, 3-4, 4-5, 5-3',
    options: ['Sí, es conexo', 'No, no es conexo'],
    statement: 'Un grafo es conexo si existe un camino entre cualquier par de vértices.',
    instructions: 'Observa el grafo. ¿Es conexo?',
    check: choice((g) => (connectedComponents(g).length === 1 ? 'Sí, es conexo' : 'No, no es conexo')),
    explain: (g) => [`Componentes: ${connectedComponents(g).map((c) => `{${c.join(', ')}}`).join(', ')}.`, connectedComponents(g).length === 1 ? 'Hay una sola componente.' : 'No existe ninguna ficha que conecte una componente con la otra.'],
  },
  {
    id: 'n3-componentes', level: 3, title: 'Contar componentes', kind: 'number', points: 15, seconds: 45,
    tiles: '0-1, 2-3, 3-4, 5-5', vertices: STD,
    statement: 'Los vértices aislados también forman su propia componente conexa.',
    instructions: '¿Cuántas componentes conexas tiene el grafo (incluyendo vértices aislados)?',
    check: num((g) => connectedComponents(g).length),
    explain: (g) => [`Componentes: ${connectedComponents(g).map((c) => `{${c.join(', ')}}`).join(', ')}.`, 'El vértice 5 solo tiene un bucle: está aislado de los demás aunque tenga grado 2.'],
  },
  {
    id: 'n3-bfs', level: 3, title: 'Orden BFS', kind: 'vertex-seq', points: 20, seconds: 60,
    tiles: '0-2, 0-5, 2-3, 5-1, 3-4, 1-6',
    statement: 'BFS visita por niveles usando una cola. Cuando un vértice tiene varios vecinos nuevos, los encola en orden creciente.',
    instructions: 'Haz clic en los vértices en el orden en que BFS los visita empezando en 0.',
    check: order((g) => bfs(g, 0).order, 'BFS'),
    explain: (g) => { const r = bfs(g, 0); return [`Orden BFS: ${r.order.join(' → ')}.`, `Distancias desde 0: ${r.order.map((v) => `${v}:${r.distance.get(v)}`).join(', ')}. Primero se visitan los de distancia 1, luego los de distancia 2, etc.`]; },
  },
  {
    id: 'n3-dfs', level: 3, title: 'Orden DFS', kind: 'vertex-seq', points: 20, seconds: 60,
    tiles: '0-2, 0-5, 2-3, 5-1, 3-4, 1-6',
    statement: 'DFS avanza lo más profundo posible (eligiendo el vecino menor) y retrocede al quedarse sin salida.',
    instructions: 'Haz clic en los vértices en el orden en que DFS los visita empezando en 0.',
    check: order((g) => dfs(g, 0).order, 'DFS'),
    explain: (g) => [`Orden DFS: ${dfs(g, 0).order.join(' → ')}.`, 'Compárelo con BFS en el mismo grafo: DFS termina una rama completa (0, 2, 3, 4) antes de volver a 0 para explorar 5.'],
  },

  // ===== Nivel 4 · Recorridos
  {
    id: 'n4-tipo', level: 4, title: 'Clasificar un recorrido', kind: 'choice', points: 15, seconds: 45,
    tiles: '0-1, 1-2, 2-0, 2-3',
    options: ['Camino simple', 'Ciclo', 'Circuito (no ciclo)', 'Camino con aristas repetidas'],
    statement: 'Considera la secuencia de vértices 0 → 1 → 2 → 0.',
    instructions: '¿Qué tipo de recorrido es?',
    check: choice((g) => nameOf(analyzeWalk(g, [0, 1, 2, 0]).type)),
    explain: (g) => analyzeWalk(g, [0, 1, 2, 0]).explanation,
  },
  {
    id: 'n4-circuito', level: 4, title: 'Circuito o ciclo', kind: 'choice', points: 20, seconds: 50,
    tiles: '0-1, 1-2, 2-0, 0-3, 3-4, 4-0',
    options: ['Camino simple', 'Ciclo', 'Circuito (no ciclo)', 'Camino con aristas repetidas'],
    statement: 'Considera la secuencia 0 → 1 → 2 → 0 → 3 → 4 → 0 en este grafo con forma de "moño".',
    instructions: '¿Qué tipo de recorrido es?',
    check: choice((g) => nameOf(analyzeWalk(g, [0, 1, 2, 0, 3, 4, 0]).type)),
    explain: (g) => analyzeWalk(g, [0, 1, 2, 0, 3, 4, 0]).explanation,
  },
  {
    id: 'n4-simple', level: 4, title: 'Construir un camino simple', kind: 'vertex-seq', points: 20, seconds: 60,
    tiles: '1-2, 2-3, 3-4, 1-4, 2-5, 5-5, 4-6',
    statement: 'Un camino simple no repite vértices.',
    instructions: 'Construye un camino simple de exactamente 4 aristas que empiece en el vértice 1.',
    check: (g, a) => {
      if (a.kind !== 'vertex-seq') return wrong('Respuesta no válida.');
      const w = analyzeWalk(g, a.value);
      if (!w.valid) return wrong(w.explanation[0]);
      if (a.value[0] !== 1) return wrong('Debe empezar en el vértice 1.');
      if (w.type !== 'camino-simple') return wrong(`Es un(a) ${w.title.toLowerCase()}, no un camino simple.`);
      if (w.edges.length !== 4) return wrong(`Tiene ${w.edges.length} aristas; se piden 4.`);
      return ok(`Correcto: ${a.value.join(' → ')} es un camino simple de longitud 4.`);
    },
    explain: () => ['Ejemplos válidos: 1 → 2 → 3 → 4 → 6, o 1 → 4 → 3 → 2 → 5.', 'No sirve pasar por el bucle 5-5 (repetiría el vértice 5).'],
  },

  // ===== Nivel 5 · Euler
  {
    id: 'n5-condicion', level: 5, title: 'Condición de Euler', kind: 'choice', points: 20, seconds: 50,
    tiles: '0-1, 1-2, 2-3, 3-0, 0-2',
    options: ['Circuito euleriano', 'Camino euleriano abierto', 'No existe recorrido euleriano'],
    statement: 'Analiza la paridad de los grados y la conectividad.',
    instructions: '¿Qué recorrido euleriano admite este conjunto de fichas?',
    check: choice((g) => eulerName(g)),
    explain: (g) => analyzeEuler(g).reasons,
  },
  {
    id: 'n5-camino', level: 5, title: 'Resolver un camino euleriano', kind: 'tile-seq', points: 25, seconds: 90,
    tiles: '0-1, 1-2, 2-2, 2-3, 3-1, 1-4',
    statement: 'Usa todas las fichas exactamente una vez formando una sola cadena de dominó.',
    instructions: 'Haz clic en las fichas en orden para formar la cadena. Pista: empieza en un vértice de grado impar.',
    check: (g, a) => tileCheck(g, a, false),
    explain: (g) => [...analyzeEuler(g).reasons, `Una solución (Hierholzer): ${hierholzer(g)!.trail.vertices.join(' → ')}.`],
  },
  {
    id: 'n5-circuito', level: 5, title: 'Construir un circuito', kind: 'tile-seq', points: 30, seconds: 120,
    tiles: '0-1, 1-2, 2-0, 0-3, 3-4, 4-0, 4-4',
    statement: 'Todos los grados son pares y el grafo es conexo, así que existe un circuito.',
    instructions: 'Forma una cadena cerrada con todas las fichas (la última debe encajar con la primera).',
    check: (g, a) => tileCheck(g, a, true),
    explain: (g) => [...analyzeEuler(g).reasons, `Una solución (Hierholzer): ${hierholzer(g)!.trail.vertices.join(' → ')}.`],
  },

  // ===== Nivel 6 · Retos avanzados
  {
    id: 'n6-quitar', level: 6, title: 'Dominó completo sin una ficha', kind: 'choice', points: 25, seconds: 60,
    tiles: generateTileSet(6).filter((t) => t.id !== '3-5').map((t) => t.id).join(', '),
    options: ['Circuito euleriano', 'Camino euleriano abierto', 'No existe recorrido euleriano'],
    statement: 'Se retiró la ficha 3-5 del dominó doble-seis completo (quedan 27).',
    instructions: '¿Qué recorrido admiten las 27 fichas restantes?',
    check: choice((g) => eulerName(g)),
    explain: (g) => [`Al quitar 3-5, los vértices 3 y 5 pasan de grado 8 a ${g.degree(3)}: ahora son impares.`, ...analyzeEuler(g).reasons.slice(-1)],
  },
  {
    id: 'n6-algoritmo', level: 6, title: 'Comparar algoritmos', kind: 'choice', points: 20, seconds: 45,
    tiles: '0-1, 1-2, 2-0',
    options: ['Hierholzer, O(|E|)', 'Fleury, O(|E|)', 'BFS, O(|V|²)', 'Backtracking, O(|E|)'],
    statement: 'Necesitas encontrar el circuito euleriano de un dominó doble-nueve (55 fichas) lo más rápido posible.',
    instructions: '¿Qué algoritmo y complejidad son los adecuados?',
    check: choice(() => 'Hierholzer, O(|E|)'),
    explain: () => ['Hierholzer recorre cada arista una vez y empalma los subciclos: O(|E|).', 'Fleury necesita comprobar puentes en cada paso: O(|E|²). Backtracking puede ser exponencial. BFS no construye recorridos eulerianos.'],
  },
  {
    id: 'n6-backtracking', level: 6, title: 'Contar cadenas', kind: 'number', points: 25, seconds: 75,
    tiles: '0-1, 0-2, 1-2, 2-3',
    statement: 'Una cadena de dominó empieza en el vértice 0 y usa exactamente 2 fichas distintas.',
    instructions: '¿Cuántas cadenas distintas de 2 fichas empiezan en 0?',
    check: num((g) => findChains(g, 0, { mode: 'length', targetLength: 2, maxSolutions: 1000 }).solutions.length),
    explain: (g) => { const r = findChains(g, 0, { mode: 'length', targetLength: 2, maxSolutions: 1000 }); return [`El backtracking encuentra ${r.solutions.length}: ${r.solutions.map((s) => s.map((l) => `${l.from}|${l.to}`).join(' ')).join(' · ')}.`, `Exploró ${r.explored} nodos y retrocedió ${r.backtracks} veces.`]; },
  },
];

function nameOf(t: string): string {
  return ({ 'camino-simple': 'Camino simple', ciclo: 'Ciclo', circuito: 'Circuito (no ciclo)', camino: 'Camino con aristas repetidas' } as Record<string, string>)[t] ?? t;
}

function tileCheck(g: MultiGraph, a: ChallengeAnswer, closed: boolean): ChallengeCheck {
  if (a.kind !== 'tile-seq') return wrong('Respuesta no válida.');
  const v = validateTileSequence(g, a.value);
  if (!v.valid) return wrong(v.errors[0] ?? 'Selecciona al menos una ficha.');
  if (!v.usesAllEdges) return wrong(`La cadena es válida pero usa ${a.value.length} de ${g.size} fichas.`);
  if (closed && !v.closed) return wrong('Usa todas las fichas, pero la cadena no se cierra: el último valor debe coincidir con el primero.');
  return ok(`Correcto: ${v.links.map((l) => `${l.from}|${l.to}`).join(' ')} ${closed ? 'forma un circuito euleriano' : 'es un camino euleriano'}.`);
}

export function challengeGraph(c: Challenge): MultiGraph {
  return MultiGraph.fromTiles(parseTiles(c.tiles), c.vertices);
}
