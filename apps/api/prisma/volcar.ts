// Comando `pnpm db:volcar`. Carga los datos de DATA_DIR en la base.
import { volcar } from "../src/volcado/volcar.js";
import { crearPrisma } from "../src/prisma.js";

async function main() {
  const dataDir = process.env.DATA_DIR;
  if (!dataDir) {
    throw new Error("Falta DATA_DIR en apps/api/.env: la carpeta con historial/spot.csv y catalogo-activos.csv.");
  }
  const prisma = crearPrisma();
  try {
    const { movimientos, activos } = await volcar(prisma, dataDir);
    console.log(`Listo: ${movimientos} movimientos y ${activos} activos en la base.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
