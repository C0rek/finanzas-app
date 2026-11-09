// El controlador es la puerta de entrada HTTP: recibe la consulta y delega.
import { Controller, Get, Inject } from "@nestjs/common";
import { responder } from "../comun/responder.js";
import type { RespuestaEvolucion } from "./evolucion.js";
import type { RespuestaExposicionBtc } from "./exposicion-btc.js";
import { PatrimonioService } from "./patrimonio.service.js";
import type { RespuestaPosiciones } from "./posiciones.js";
import type { RespuestaPatrimonio } from "./valuador.js";

@Controller()
export class PatrimonioController {
  constructor(@Inject(PatrimonioService) private readonly patrimonio: PatrimonioService) {}

  @Get("patrimonio")
  obtener(): Promise<RespuestaPatrimonio> {
    return responder(() => this.patrimonio.consultar());
  }

  @Get("patrimonio/exposicion-btc")
  obtenerExposicionBtc(): Promise<RespuestaExposicionBtc> {
    return responder(() => this.patrimonio.exposicionBtc());
  }

  @Get("patrimonio/evolucion")
  obtenerEvolucion(): Promise<RespuestaEvolucion> {
    return responder(() => this.patrimonio.evolucion());
  }

  @Get("posiciones")
  obtenerPosiciones(): Promise<RespuestaPosiciones> {
    return responder(() => this.patrimonio.posiciones());
  }
}
