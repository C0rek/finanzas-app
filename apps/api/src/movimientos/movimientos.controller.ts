import { Controller, Get, Inject } from "@nestjs/common";
import { responder } from "../comun/responder.js";
import type { MovimientoApi } from "./armar-movimientos.js";
import { MovimientosService } from "./movimientos.service.js";

@Controller("movimientos")
export class MovimientosController {
  constructor(@Inject(MovimientosService) private readonly movimientos: MovimientosService) {}

  @Get()
  listar(): Promise<MovimientoApi[]> {
    return responder(() => this.movimientos.listar());
  }
}
