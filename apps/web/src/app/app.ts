import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BarraSuperior } from './layout/barra-superior/barra-superior';
import { RielNavegacion } from './layout/riel-navegacion/riel-navegacion';

@Component({
  imports: [RouterOutlet, BarraSuperior, RielNavegacion],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
