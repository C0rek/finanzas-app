-- CreateEnum
CREATE TYPE "GrupoActivo" AS ENUM ('POSICION', 'LIQUIDEZ', 'COLCHON');

-- AlterTable
ALTER TABLE "activos" ADD COLUMN     "grupo" "GrupoActivo" NOT NULL DEFAULT 'POSICION';
