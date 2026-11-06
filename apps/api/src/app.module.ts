// Módulo raíz de NestJS: declara las piezas del servidor y cómo se crean.
//
// NestJS arma los objetos por nosotros ("inyección de dependencias"): cada clase
// pide lo que necesita y Nest se lo pasa. Eso permite reemplazar piezas en los
// tests, por ejemplo un proveedor de precios real por uno falso.
//
// Usamos tokens y @Inject explícitos porque `tsx` no genera la información de
// tipos que Nest usa normalmente para adivinar qué inyectar.
import { Module } from "@nestjs/common";
import { PatrimonioController } from "./patrimonio/patrimonio.controller.js";
import { PatrimonioService } from "./patrimonio/patrimonio.service.js";
import { ProveedorBinance } from "./precios/binance.js";
import { ProveedorFinnhub } from "./precios/finnhub.js";
import { PreciosService } from "./precios/precios.service.js";
import type { ProveedorPrecios } from "./precios/proveedor-precios.js";
import { crearPrisma } from "./prisma.js";
import type { PrismaClient } from "./generated/prisma/client.js";

export const PRISMA = Symbol("PRISMA");
export const PROVEEDORES = Symbol("PROVEEDORES");
export const PRECIOS = Symbol("PRECIOS");

@Module({
  controllers: [PatrimonioController],
  providers: [
    { provide: PRISMA, useFactory: () => crearPrisma() },
    {
      provide: PROVEEDORES,
      useFactory: () => ({
        CRIPTO: new ProveedorBinance(),
        BOLSA: new ProveedorFinnhub(process.env.FINNHUB_API_KEY),
      }),
    },
    {
      provide: PRECIOS,
      useFactory: (prisma: PrismaClient, proveedores: { CRIPTO: ProveedorPrecios; BOLSA: ProveedorPrecios }) =>
        new PreciosService(prisma, proveedores),
      inject: [PRISMA, PROVEEDORES],
    },
    {
      provide: PatrimonioService,
      useFactory: (prisma: PrismaClient, precios: PreciosService) => new PatrimonioService(prisma, precios),
      inject: [PRISMA, PRECIOS],
    },
  ],
})
export class AppModule {}
