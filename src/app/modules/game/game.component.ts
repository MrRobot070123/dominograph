import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { degreeMap } from '../../core/algorithms/degree';
import { analyzeEuler } from '../../core/algorithms/euler';
import { chainAsTrail, chainGraph, handPoints, remainingGraph } from '../../core/game-engine/game-engine';
import { AiLevel, DrawRule, StartRule } from '../../core/game-engine/game.models';
import { GameService, GameSettings } from '../../core/services/game.service';
import { LabStateService } from '../../core/services/lab-state.service';
import { DominoTileComponent } from '../../shared/components/domino-tile/domino-tile.component';
import { GraphViewComponent } from '../../shared/components/graph-view/graph-view.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { circleLayout } from '../../shared/utils/layout';

/** Módulo 2: partida de dominó contra la computadora con análisis de grafos. */
@Component({
  selector: 'app-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DominoTileComponent, GraphViewComponent, IconComponent],
  templateUrl: './game.component.html',
  styleUrl: './game.component.css',
})
export class GameComponent {
  readonly game = inject(GameService);
  private readonly lab = inject(LabStateService);
  private readonly router = inject(Router);
  private readonly board = viewChild<ElementRef<HTMLElement>>('board');

  readonly s = this.game.state;
  readonly showSettings = signal(false);
  readonly draft = signal<GameSettings>(this.game.settings());
  readonly analysisTab = signal<'mesa' | 'restantes'>('mesa');
  readonly showAiDetail = signal(false);
  readonly positions = circleLayout([0, 1, 2, 3, 4, 5, 6]);

  readonly cpuCount = computed(() => this.s().hands.cpu.length);
  readonly humanPoints = computed(() => handPoints(this.s().hands.human));
  readonly lastEvents = computed(() => [...this.s().history].reverse().slice(0, 14));

  // ---------------------------------------------------------- integración con grafos
  readonly tableGraph = computed(() => chainGraph(this.s()));
  readonly restGraph = computed(() => remainingGraph(this.s()));
  readonly shownGraph = computed(() => (this.analysisTab() === 'mesa' ? this.tableGraph() : this.restGraph()));
  readonly shownEuler = computed(() => analyzeEuler(this.shownGraph()));
  readonly shownDegrees = computed(() => [...degreeMap(this.shownGraph())].map(([v, d]) => ({ v, d })));
  readonly trail = computed(() => chainAsTrail(this.s()));
  readonly graphEdgeClass = computed(() => {
    const out: Record<string, string> = {};
    if (this.analysisTab() === 'mesa') {
      for (const id of this.trail().edges) out[id] = 'path';
      const last = this.game.lastPlayedId();
      if (last && out[last]) out[last] = 'active';
    }
    return out;
  });
  readonly graphVertexClass = computed(() => {
    const out: Record<number, string> = {};
    for (const [v, d] of degreeMap(this.shownGraph())) out[v] = d === 0 ? 'isolated' : d % 2 ? 'odd' : '';
    const e = this.game.ends();
    if (e && this.analysisTab() === 'mesa') {
      out[e.left] = (out[e.left] ?? '') + ' start';
      out[e.right] = (out[e.right] ?? '') + ' current';
    }
    return out;
  });

  constructor() {
    // Desplaza el tablero hacia el extremo donde se colocó la última ficha.
    effect(() => {
      const s = this.s();
      const last = this.game.lastPlayedId();
      const el = this.board()?.nativeElement;
      if (!el || !last) return;
      const atLeft = s.chain.length > 0 && s.chain[0].tile.id === last;
      queueMicrotask(() => el.scrollTo({ left: atLeft ? 0 : el.scrollWidth, behavior: 'smooth' }));
    });
  }

  tileState(id: string): string | null {
    if (this.game.selectedTile() === id) return 'selected';
    if (!this.game.humanTurn()) return null;
    return this.game.playableIds().has(id) ? 'playable' : 'disabled';
  }

  onHandClick(id: string): void {
    if (!this.game.humanTurn()) return;
    if (!this.game.playableIds().has(id)) {
      this.game.selectedTile.set(null);
      this.notPlayable.set(id);
      return;
    }
    this.notPlayable.set(null);
    this.game.select(id);
  }
  readonly notPlayable = signal<string | null>(null);

  isDoubleAt(i: number): boolean {
    const p = this.s().chain[i];
    return p.left === p.right;
  }

  applySettings(): void {
    this.game.newGame(this.draft());
    this.showSettings.set(false);
  }

  patch(k: 'startRule' | 'drawRule' | 'aiLevel', v: string): void {
    const allowed: Record<typeof k, readonly string[]> = {
      startRule: ['highest-double', 'human-first', 'cpu-first'] satisfies StartRule[],
      drawRule: ['draw-until-playable', 'draw-one', 'no-draw'] satisfies DrawRule[],
      aiLevel: ['basico', 'estrategico', 'experto'] satisfies AiLevel[],
    };
    if (allowed[k].includes(v)) this.draft.update((d) => ({ ...d, [k]: v }) as GameSettings);
  }

  analyzeInLab(kind: 'mesa' | 'restantes'): void {
    const g = kind === 'mesa' ? this.tableGraph() : this.restGraph();
    this.lab.setGraph(g, kind === 'mesa' ? 'Partida: fichas en la mesa' : 'Partida: fichas sin jugar');
    if (kind === 'mesa') this.lab.pendingWalk.set(this.trail());
    this.router.navigateByUrl(kind === 'mesa' ? '/laboratorio/caminos' : '/laboratorio/euler');
  }

  ruleName(r: string): string {
    return ({ 'highest-double': 'Sale el doble más alto', 'human-first': 'Sale el jugador', 'cpu-first': 'Sale la CPU', 'draw-until-playable': 'Robar hasta poder jugar', 'draw-one': 'Robar una ficha', 'no-draw': 'Sin pozo (pasar)', basico: 'Básico', estrategico: 'Estratégico', experto: 'Experto (Minimax α-β)' } as Record<string, string>)[r] ?? r;
  }
}
