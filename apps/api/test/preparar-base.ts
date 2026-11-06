// Prepara la base de los tests. Vitest corre `setup` una sola vez, antes de todo.
import { execSync } from "node:child_process";
import pg from "pg";

const URL_DEFAULT = "postgresql://finanzas:finanzas_dev@localhost:5432/finanzas_test";

/**
 * Cinturón de seguridad: los tests borran tablas enteras. Si por error apuntaran
 * a la base con tus datos reales, los perderías. Por eso se niegan a correr
 * contra una base cuyo nombre no termine en `_test`.
 */
export function asegurarBaseDeTest(url: string): void {
  const nombre = new URL(url).pathname.slice(1);
  if (!nombre.endsWith("_test")) {
    throw new Error(`Los tests solo corren contra una base terminada en _test. Vino: "${nombre}".`);
  }
}

export async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL ?? URL_DEFAULT;
  asegurarBaseDeTest(url);

  // CREATE DATABASE hay que correrlo conectado a otra base que ya exista.
  const destino = new URL(url);
  const nombre = destino.pathname.slice(1);
  const administracion = new URL(url);
  administracion.pathname = "/postgres";

  const cliente = new pg.Client({ connectionString: administracion.toString() });
  await cliente.connect();
  try {
    const existe = await cliente.query("SELECT 1 FROM pg_database WHERE datname = $1", [nombre]);
    if (existe.rowCount === 0) {
      // El nombre no se puede pasar como parámetro, pero ya validamos que termina en _test.
      await cliente.query(`CREATE DATABASE "${nombre.replaceAll('"', "")}"`);
    }
  } finally {
    await cliente.end();
  }

  execSync("pnpm exec prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}
