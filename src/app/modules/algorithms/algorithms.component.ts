import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ALGORITHMS, AlgorithmInfo } from '../../core/algorithms/catalog';

/** Ficha técnica de los algoritmos: descripción, E/S, complejidad, validaciones y ejemplo en vivo. */
@Component({
  selector: 'app-algorithms',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="eyebrow">Motor matemático</div>
          <h1>Algoritmos implementados</h1>
          <p>Cada algoritmo vive en un archivo independiente, sin dependencias de Angular, y tiene pruebas unitarias. El ejemplo de cada ficha se ejecuta en vivo sobre el grafo de muestra 0-1, 0-2, 1-2, 2-3, 3-3.</p>
        </div>
      </div>
      <section class="card model">
        <h2>Modelo: el dominó como multigrafo</h2>
        <div class="grid3">
          <div><b>Vértices</b><span>Los valores 0 a 6.</span></div>
          <div><b>Aristas</b><span>Cada ficha a-b une a y b.</span></div>
          <div><b>Bucles</b><span>Las dobles; suman 2 al grado.</span></div>
          <div><b>Aristas paralelas</b><span>Fichas repetidas en conjuntos personalizados.</span></div>
          <div><b>Cadena de juego</b><span>Camino sin aristas repetidas (usa algunas fichas).</span></div>
          <div><b>Recorrido euleriano</b><span>Usa todas las fichas una vez.</span></div>
        </div>
      </section>
      <div class="list">
        @for (a of algorithms; track a.id) {
          <article class="card algo">
            <div class="head">
              <h2>{{ a.name }}</h2>
              <span class="chip" [class.ok]="a.priority === 'obligatorio'">{{ a.priority }}</span>
              <code class="file">{{ a.file }}</code>
            </div>
            <p>{{ a.description }}</p>
            <dl>
              <dt>Entradas</dt><dd>{{ a.inputs }}</dd>
              <dt>Salidas</dt><dd>{{ a.outputs }}</dd>
              <dt>Tiempo</dt><dd class="mono">{{ a.time }}</dd>
              <dt>Espacio</dt><dd class="mono">{{ a.space }}</dd>
              <dt>Validaciones</dt><dd>{{ a.validations }}</dd>
              <dt>Pruebas</dt><dd>{{ a.tests }}</dd>
            </dl>
            <div class="ex">
              <button class="btn sm" (click)="run(a)">Ejecutar ejemplo</button>
              @if (output()[a.id]; as o) { <code>{{ o }}</code> }
            </div>
          </article>
        }
      </div>
    </div>
  `,
  styles: `
    .model { margin-bottom: 16px; }
    .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .grid3 div { display: flex; flex-direction: column; padding: 10px 12px; border-radius: 10px; background: var(--night-2); border: 1px solid var(--line-soft); }
    .grid3 b { color: var(--cyan); } .grid3 span { font-size: 0.88rem; color: var(--muted); }
    .list { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 16px; }
    .head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 6px; }
    .head h2 { margin: 0; }
    .file { margin-left: auto; color: var(--muted); font-size: 0.78rem; }
    dl { display: grid; grid-template-columns: 110px 1fr; gap: 4px 10px; margin: 0 0 10px; font-size: 0.88rem; }
    dt { color: var(--muted); } dd { margin: 0; }
    .ex { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .ex code { background: var(--night-2); border: 1px solid var(--line-soft); padding: 6px 10px; border-radius: 8px; color: #bfeaf4; word-break: break-word; font-size: 0.82rem; }
    @media (max-width: 760px) { .grid3 { grid-template-columns: 1fr 1fr; } .list { grid-template-columns: 1fr; } }
  `,
})
export class AlgorithmsComponent {
  readonly algorithms = ALGORITHMS;
  readonly output = signal<Record<string, string>>({});

  run(a: AlgorithmInfo): void {
    let out: string;
    try {
      out = a.example();
    } catch (e) {
      out = `Error: ${(e as Error).message}`;
    }
    this.output.update((o) => ({ ...o, [a.id]: out }));
  }
}
