# DOMINOGRAPH

**Donde cada ficha conecta un grafo.**

Aplicación web educativa que integra un juego de dominó doble-seis contra la computadora con un laboratorio interactivo de teoría de grafos. Las 28 fichas se modelan como un **multigrafo no dirigido** G = (V, E): cada valor 0–6 es un vértice, cada ficha es una arista, las dobles son bucles y las fichas repetidas (en conjuntos personalizados) son aristas paralelas.

Autores: **Franco Miranda** y **Daniel Pacheco**, Ingeniería de Sistemas.

---

## 1. Cómo ejecutarlo

Requisitos: Node.js 22 o superior y npm.

```bash
npm install
npm start            # abre http://localhost:4200
```

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run build` | Compila para producción en `dist/dominograph/browser` |
| `npm test` | Ejecuta las pruebas unitarias con el builder de Angular (Vitest) |
| `npm run test:engine` | Ejecuta solo las pruebas del motor matemático y de juego con Vitest |

La aplicación usa rutas con `#` (hash), por lo que el contenido de `dist/dominograph/browser` funciona en cualquier hosting estático (GitHub Pages, Netlify, etc.) sin configuración adicional.

## 2. Tecnologías

- **Angular 22** con componentes standalone (sin NgModules), signals, control flow (`@if`, `@for`) y detección de cambios zoneless.
- **TypeScript** en modo estricto (`strict`, `strictTemplates`).
- **SVG** propio para el visualizador de grafos y las fichas; sin librerías gráficas externas.
- **localStorage** para persistencia local (progreso, estadísticas, configuraciones guardadas). Preparado para Supabase a través de `StorageService`.
- **Vitest** para las pruebas.

No se usan dependencias fuera del ecosistema base de Angular.

## 3. Arquitectura

```
src/app/
├── core/
│   ├── models/          Tipos del dominio (Tile, GraphEdge, Trail, Challenge…)
│   ├── graph-engine/    MultiGraph inmutable (bucles y aristas paralelas con id propio)
│   ├── algorithms/      Un archivo por algoritmo + pruebas
│   ├── game-engine/     Reglas del dominó (funciones puras) e IA
│   └── services/        Estado de aplicación: laboratorio, juego, progreso, almacenamiento, errores
├── modules/
│   ├── dashboard/       Panel principal
│   ├── game/            Juego contra la computadora
│   ├── graph-lab/       Laboratorio (9 herramientas como rutas hijas)
│   ├── challenges/      Banco de desafíos y reproductor
│   └── algorithms/      Ficha técnica de los algoritmos
└── shared/
    ├── components/      graph-view (SVG), domino-tile, step-controls, icon, logo
    ├── layouts/         Shell con barra lateral responsiva
    └── utils/           Distribución de vértices, reproductor de pasos
```

Principios aplicados:

- **El motor matemático no depende de Angular ni del DOM.** `core/graph-engine` y `core/algorithms` son TypeScript puro.
- **Un solo motor.** El juego, el laboratorio y los desafíos usan las mismas funciones. Por ejemplo, la cadena de la mesa se analiza con `analyzeWalk` y los desafíos se validan con `analyzeEuler`, `bfs`, `validateTileSequence`, etc.
- **Nada calculado a mano.** Todas las propiedades, explicaciones y respuestas de los desafíos se calculan con el motor en tiempo real.
- **No limitado al doble-seis.** `generateTileSet(n)` y `MultiGraph` aceptan cualquier tamaño; solo la interfaz del juego fija n = 6.
- **Inmutabilidad.** `MultiGraph` y `GameState` nunca se modifican: cada operación devuelve un nuevo objeto, lo que simplifica signals, historial, comparación y pruebas.

## 4. Algoritmos implementados

| Algoritmo | Archivo | Tiempo |
|---|---|---|
| Generación de fichas | `core/algorithms/tiles.ts` | O(n²) |
| Multigrafo | `core/graph-engine/multigraph.ts` | O(\|V\| + \|E\|) |
| Matriz de adyacencia | `core/algorithms/adjacency.ts` | O(\|V\|² + \|E\|) |
| Lista de adyacencia | `core/algorithms/adjacency.ts` | O(\|V\| + \|E\|) |
| Grados y apretón de manos | `core/algorithms/degree.ts` | O(\|V\| + \|E\|) |
| BFS | `core/algorithms/bfs.ts` | O(\|V\| + \|E\|) |
| DFS | `core/algorithms/dfs.ts` | O(\|V\| + \|E\|) |
| Componentes conexas | `core/algorithms/components.ts` | O(\|V\| + \|E\|) |
| Validación euleriana | `core/algorithms/euler.ts` | O(\|V\| + \|E\|) |
| Hierholzer (+ validador) | `core/algorithms/hierholzer.ts` | O(\|E\|) |
| Validación de secuencias | `core/algorithms/sequence.ts` | O(k) |
| Caminos, ciclos y circuitos | `core/algorithms/walk.ts` | O(k·Δ) |
| Fleury (didáctico) | `core/algorithms/fleury.ts` | O(\|E\|²) |
| Backtracking | `core/algorithms/backtracking.ts` | exponencial, acotado |
| Comparador de grafos | `core/algorithms/compare.ts` | O(\|V\| + \|E\|) |
| IA heurística y Minimax α-β | `core/game-engine/ai.ts` | O(b^d) |

La sección **Algoritmos** de la aplicación muestra para cada uno: descripción, entradas, salidas, complejidad temporal y espacial, validaciones, pruebas asociadas y un ejemplo que se ejecuta en vivo.

## 5. Pruebas

39 pruebas en `*.spec.ts`. Incluyen las 12 obligatorias de la especificación:

1. Generación de las 28 fichas (y 55 del doble-nueve).
2. Identificación de las 7 dobles.
3. Grado de un vértice con bucle (cuenta 2); grado 8 en el dominó completo y Σ grado = 2|E|.
4. Conservación de aristas paralelas (1-3 y 1-3#2).
5. Matriz de adyacencia con bucles en la diagonal y grado = Σ fila + A[i][i].
6. Componentes conexas, BFS, DFS y vértices no alcanzables.
7. Detección de circuito euleriano (incluso con vértices aislados).
8. Detección de camino euleriano abierto.
9. Rechazo con más de dos vértices impares o aristas desconectadas.
10. Validación de los recorridos de Hierholzer (todas las aristas, sin repetir, consecutivas, inicio y fin), con bucles y paralelas; también Fleury y detección de puentes.
11. Jugadas legales, robo, pase, cierre y puntuación.
12. Integración juego–laboratorio: la cadena de la mesa es un camino sin aristas repetidas del multigrafo de las fichas jugadas.

Además: IA (elige jugadas legales, prefiere ganar, partida IA contra IA completa), caminos y ciclos, backtracking, comparador y el banco de desafíos.

Las pruebas no se consideran aprobadas solo porque no hay errores de ejecución: verifican la corrección matemática del resultado.

## 6. Registro de estado

### Funcionalidades terminadas

- **Dashboard:** identidad visual, accesos, estadísticas, progreso por nivel, conceptos dominados y última actividad.
- **Juego:**
  - Partida contra la CPU (7 + 7 fichas, pozo de 14).
  - Reglas de salida y de pozo configurables.
  - Tablero con desplazamiento horizontal, dobles en vertical y extremos resaltados.
  - Selección de fichas con cancelación y elección de lado.
  - Sugerencias para el jugador.
  - IA en tres niveles (básico, estratégico heurístico, experto con Minimax α-β) que muestra su análisis.
  - Detección de dominó, partida cerrada y empate.
  - Resumen final y análisis de la mesa y de las fichas sin jugar como grafos.
  - Envío de la cadena al laboratorio.
- **Laboratorio:**
  - Constructor con agregar/eliminar vértices (con confirmación de aristas incidentes), agregar/eliminar aristas, bucles, paralelas, fichas por texto, arrastre, reorganización, limpiar, reiniciar y guardar/cargar configuraciones.
  - Visualizador SVG con leyendas.
  - Panel de propiedades.
  - Matriz y lista de adyacencia con resaltado y comparación.
  - Analizador de grados con simulación de agregar/quitar fichas.
  - BFS y DFS paso a paso con reproducción, pausa, paso y reinicio.
  - Componentes conexas.
  - Caminos y ciclos.
  - Euler con Hierholzer animado y Fleury didáctico.
  - Backtracking.
  - Comparador.
  - Experimento guiado de las 28 fichas.
- **Desafíos:** 20 retos en 6 niveles con enunciado, fichas y grafo de referencia, instrucciones, modo contrarreloj opcional, validación con el motor, explicación matemática, puntuación y progreso.
- **Accesibilidad y diseño responsivo:**
  - Navegación con teclado (vértices y aristas enfocables) y foco visible.
  - Etiquetas ARIA y regiones `aria-live` para mensajes.
  - Diseño adaptado a escritorio, tablet y móvil.

### Decisiones de arquitectura

- Al eliminar un vértice se eliminan sus aristas incidentes. Si tiene aristas, la interfaz pide confirmación primero.
- La matriz guarda la cantidad de bucles en A[i][i] y el grado se calcula como Σ fila + A[i][i].
- Para Euler solo se exige que las aristas estén en una componente; los vértices aislados se ignoran.
- La IA "experto" maneja la información imperfecta repartiendo de forma plausible las fichas no vistas (respetando los valores que el rival demostró no tener) y promedia Minimax α-β sobre 6 escenarios.
- Las variantes de reglas (salida y pozo) son configurables en lugar de fijas.
- Se usan rutas con hash para poder publicar en cualquier hosting estático.

### Pendiente / trabajo futuro

- Autenticación y persistencia en la nube con Supabase (la interfaz `StorageService` ya centraliza el acceso).
- Modo multijugador e historial de partidas detallado.
- Interfaz del juego para otros conjuntos (doble-nueve); el motor ya los admite.
- Internacionalización.

### Errores conocidos

- Ninguno reportado en las pruebas actuales.
