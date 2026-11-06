-- CreateEnum
CREATE TYPE "FuentePrecio" AS ENUM ('CRIPTO', 'BOLSA', 'MANUAL');

-- CreateEnum
CREATE TYPE "OrigenPrecio" AS ENUM ('API', 'MANUAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoActivo" ADD VALUE 'FONDO';
ALTER TYPE "TipoActivo" ADD VALUE 'BONO';
ALTER TYPE "TipoActivo" ADD VALUE 'ACCION';

-- AlterEnum
ALTER TYPE "TipoMovimiento" ADD VALUE 'AJUSTE';

-- AlterTable
ALTER TABLE "activos" ADD COLUMN     "fuentePrecio" "FuentePrecio",
ADD COLUMN     "ratio" DECIMAL(36,18),
ADD COLUMN     "simboloPrecio" TEXT;

-- AlterTable
ALTER TABLE "movimientos" ADD COLUMN     "idExterno" TEXT;

-- CreateTable
CREATE TABLE "precios" (
    "id" SERIAL NOT NULL,
    "activoId" INTEGER NOT NULL,
    "precioUsd" DECIMAL(36,18) NOT NULL,
    "obtenidoEn" TIMESTAMPTZ(3) NOT NULL,
    "origen" "OrigenPrecio" NOT NULL,

    CONSTRAINT "precios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "precios_activoId_key" ON "precios"("activoId");

-- CreateIndex
CREATE UNIQUE INDEX "movimientos_idExterno_key" ON "movimientos"("idExterno");

-- AddForeignKey
ALTER TABLE "precios" ADD CONSTRAINT "precios_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "activos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

