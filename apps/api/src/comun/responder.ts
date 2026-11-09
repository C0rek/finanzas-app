// Respuesta común de los controladores cuando no se pueden leer los datos.
import { ServiceUnavailableException } from "@nestjs/common";

export async function responder<T>(consulta: () => Promise<T>): Promise<T> {
  try {
    return await consulta();
  } catch (e) {
    // El detalle queda en la consola del servidor: al navegador no le mandamos
    // datos internos como la cadena de conexión.
    console.error("No se pudo responder la consulta:", e);
    throw new ServiceUnavailableException({ mensaje: "No se pudo leer la base de datos" });
  }
}
