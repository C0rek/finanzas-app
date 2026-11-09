// Cliente de la API privada de Bitunix (necesita BITUNIX_API_KEY y BITUNIX_SECRET_KEY).
//
// Por ahora solo PREPARA peticiones de lectura firmadas: a propósito no llama a `fetch`,
// así que no sale nada a la red. Enviarlas será el paso siguiente.
import { createHash, randomBytes } from "node:crypto";

const URL_BASE = "https://fapi.bitunix.com";

type Query = Record<string, string>;

export type PeticionFirmada = {
  metodo: "GET";
  url: string;
  headers: { "api-key": string; nonce: string; timestamp: string; sign: string };
};

const sha256 = (texto: string) => createHash("sha256").update(texto).digest("hex");

// Bitunix ordena los parámetros por nombre y los pega sin separadores: { uid: "200", id: "1" } → "id1uid200".
const queryOrdenada = (query: Query) =>
  Object.entries(query).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

// Firma de Bitunix: dos SHA-256 encadenados. Solo lecturas, por eso el cuerpo va vacío.
// El secreto entra en el hash pero nunca viaja: con la firma, Bitunix comprueba que lo tenemos.
export function firmar(datos: {
  apiKey: string;
  secretKey: string;
  nonce: string;
  timestamp: string;
  query: Query;
}): string {
  const parametros = queryOrdenada(datos.query).map(([clave, valor]) => clave + valor).join("");
  const digest = sha256(datos.nonce + datos.timestamp + datos.apiKey + parametros);
  return sha256(digest + datos.secretKey);
}

export class ClienteBitunix {
  // Los campos con # son privados de verdad: tampoco aparecen en un JSON.stringify o en un log.
  readonly #apiKey: string | undefined;
  readonly #secretKey: string | undefined;
  readonly #ahora: () => Date;

  constructor(apiKey: string | undefined, secretKey: string | undefined, ahora: () => Date = () => new Date()) {
    this.#apiKey = apiKey;
    this.#secretKey = secretKey;
    this.#ahora = ahora;
  }

  get configurado(): boolean {
    return Boolean(this.#apiKey && this.#secretKey);
  }

  prepararLectura(ruta: string, query: Query = {}): PeticionFirmada {
    if (!this.#apiKey || !this.#secretKey) {
      throw new Error("Faltan BITUNIX_API_KEY o BITUNIX_SECRET_KEY en apps/api/.env");
    }
    // El nonce hace única cada petición; el timestamp, en milisegundos, le da vencimiento:
    // Bitunix rechaza las que se alejan más de 60 segundos de su hora.
    const nonce = randomBytes(16).toString("hex");
    const timestamp = String(this.#ahora().getTime());
    const sign = firmar({ apiKey: this.#apiKey, secretKey: this.#secretKey, nonce, timestamp, query });
    const parametros = new URLSearchParams(queryOrdenada(query)).toString();

    return {
      metodo: "GET",
      url: `${URL_BASE}${ruta}${parametros ? `?${parametros}` : ""}`,
      headers: { "api-key": this.#apiKey, nonce, timestamp, sign },
    };
  }
}
