import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'DOMINOGRAPH · Inicio', loadComponent: () => import('./modules/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
  { path: 'jugar', title: 'DOMINOGRAPH · Jugar', loadComponent: () => import('./modules/game/game.component').then((m) => m.GameComponent) },
  {
    path: 'laboratorio',
    loadComponent: () => import('./modules/graph-lab/lab-shell.component').then((m) => m.LabShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'constructor' },
      { path: 'constructor', title: 'Laboratorio · Constructor', loadComponent: () => import('./modules/graph-lab/builder/builder.component').then((m) => m.BuilderComponent) },
      { path: 'representaciones', title: 'Laboratorio · Matriz y lista', loadComponent: () => import('./modules/graph-lab/representations/representations.component').then((m) => m.RepresentationsComponent) },
      { path: 'grados', title: 'Laboratorio · Grados', loadComponent: () => import('./modules/graph-lab/degrees/degrees.component').then((m) => m.DegreesComponent) },
      { path: 'conectividad', title: 'Laboratorio · BFS y DFS', loadComponent: () => import('./modules/graph-lab/connectivity/connectivity.component').then((m) => m.ConnectivityComponent) },
      { path: 'caminos', title: 'Laboratorio · Caminos y ciclos', loadComponent: () => import('./modules/graph-lab/walks/walks.component').then((m) => m.WalksComponent) },
      { path: 'euler', title: 'Laboratorio · Euler', loadComponent: () => import('./modules/graph-lab/euler/euler.component').then((m) => m.EulerComponent) },
      { path: 'backtracking', title: 'Laboratorio · Backtracking', loadComponent: () => import('./modules/graph-lab/backtracking/backtracking.component').then((m) => m.BacktrackingComponent) },
      { path: 'comparador', title: 'Laboratorio · Comparador', loadComponent: () => import('./modules/graph-lab/compare/compare.component').then((m) => m.CompareComponent) },
      { path: 'experimento', title: 'Laboratorio · Dominó completo', loadComponent: () => import('./modules/graph-lab/experiment/experiment.component').then((m) => m.ExperimentComponent) },
    ],
  },
  { path: 'desafios', title: 'DOMINOGRAPH · Desafíos', loadComponent: () => import('./modules/challenges/challenges.component').then((m) => m.ChallengesComponent) },
  { path: 'desafios/:id', title: 'DOMINOGRAPH · Desafío', loadComponent: () => import('./modules/challenges/challenge-player.component').then((m) => m.ChallengePlayerComponent) },
  { path: 'algoritmos', title: 'DOMINOGRAPH · Algoritmos', loadComponent: () => import('./modules/algorithms/algorithms.component').then((m) => m.AlgorithmsComponent) },
  { path: '**', redirectTo: '' },
];
