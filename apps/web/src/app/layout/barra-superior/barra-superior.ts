import { Component } from '@angular/core';
import { LucideBell, LucideMoon } from '@lucide/angular';

// "Top Bar" del boceto: marca a la izquierda, acciones y avatar a la derecha.
@Component({
  imports: [LucideMoon, LucideBell],
  selector: 'app-barra-superior',
  styleUrl: './barra-superior.scss',
  templateUrl: './barra-superior.html',
})
export class BarraSuperior {}
