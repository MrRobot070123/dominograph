import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppErrorHandler } from '../../core/services/error-handler.service';
import { IconComponent } from '../components/icon/icon.component';
import { LogoComponent } from '../components/logo/logo.component';

interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: string;
  readonly exact: boolean;
}

/** Layout principal: barra lateral, encabezado móvil y área de contenido. */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, LogoComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  readonly open = signal(false);
  readonly error = AppErrorHandler.lastError;
  readonly nav: NavItem[] = [
    { path: '/', label: 'Inicio', icon: 'home', exact: true },
    { path: '/jugar', label: 'Jugar', icon: 'play', exact: false },
    { path: '/laboratorio', label: 'Laboratorio', icon: 'lab', exact: false },
    { path: '/desafios', label: 'Desafíos', icon: 'trophy', exact: false },
    { path: '/algoritmos', label: 'Algoritmos', icon: 'book', exact: false },
  ];
}
