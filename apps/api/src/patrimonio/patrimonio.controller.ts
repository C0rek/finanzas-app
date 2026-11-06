// El controlador es la puerta de entrada HTTP: recibe la consulta y delega.
import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import type { RespuestaExposicionBtc } from "./exposicion-btc.js";
import { PatrimonioService } from "./patrimonio.service.js";
import type { RespuestaPatrimonio } from "./valuador.js";

@Controller("patrimonio")
export class PatrimonioController {
  constructor(@Inject(PatrimonioService) private readonly patrimonio: PatrimonioService) {}

  @Get()
  obtener(): Promise<RespuestaPatrimonio> {
    return this.responder(() => this.patrimonio.consultar());
  }

  @Get("exposicion-btc")
  obtenerExposicionBtc(): Promise<RespuestaExposicionBtc> {
    return this.responder(() => this.patrimonio.exposicionBtc());
  }

  private async responder<T>(consulta: () => Promise<T>): Promise<T> {
    try {
      return await consulta();
    } catch (e) {
      // El detalle queda en la consola del servidor: al navegador no le mandamos
      // datos internos como la cadena de conexión.
      console.error("No se pudo calcular el patrimonio:", e);
      throw new ServiceUnavailableException({ mensaje: "No se pudo leer la base de datos" });
    }
  }
}
