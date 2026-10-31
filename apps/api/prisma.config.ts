// Configuración de Prisma (formato de Prisma 7).
// Prisma 7 ya no lee el .env solo: por eso importamos dotenv acá arriba.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Comando que corre `pnpm db:seed` (y `prisma migrate reset`).
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // process.env (y no env()) para que `prisma generate` funcione aunque
    // todavía no exista el .env: generar el cliente no necesita conectarse.
    url: process.env.DATABASE_URL,
  },
});
