-- AlterEnum
ALTER TYPE "TipoMovimiento" ADD VALUE 'SALDO';

-- AlterTable
ALTER TABLE "activos" ADD COLUMN     "ubicacion" TEXT;

-- AlterTable
ALTER TABLE "movimientos" ADD COLUMN     "activoPagoId" INTEGER;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_activoPagoId_fkey" FOREIGN KEY ("activoPagoId") REFERENCES "activos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
