// Crea la conexión a la base que usa todo el backend.
//
// En Prisma 7 el cliente necesita un "adapter": el driver que habla con
// Postgres. Usamos @prisma/adapter-pg (basado en la librería `pg`).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

export function crearPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta DATABASE_URL. Copiá apps/api/.env.example como apps/api/.env.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
