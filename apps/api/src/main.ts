// Arranque del servidor. Se levanta con `pnpm dev:api`.
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const PUERTO = 3000;

async function main() {
  const app = await NestFactory.create(AppModule);
  // Solo 127.0.0.1: el servidor no tiene login, así que no se expone a la red.
  await app.listen(PUERTO, "127.0.0.1");
  console.log(`API en http://127.0.0.1:${PUERTO}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
