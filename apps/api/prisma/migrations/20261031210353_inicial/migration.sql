-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('COMPRA', 'VENTA', 'TRANSFER', 'PNL_FUTUROS', 'REWARD', 'APORTE', 'COMISION');

-- CreateEnum
CREATE TYPE "TipoCuenta" AS ENUM ('EXCHANGE', 'BROKER', 'WALLET', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoActivo" AS ENUM ('CRIPTO', 'STABLECOIN', 'CEDEAR', 'ACCION_TOKENIZADA', 'FIAT', 'BIEN');

-- CreateEnum
CREATE TYPE "Moneda" AS ENUM ('USD', 'ARS');

-- CreateTable
CREATE TABLE "cuentas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoCuenta" NOT NULL,

    CONSTRAINT "cuentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activos" (
    "id" SERIAL NOT NULL,
    "simbolo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoActivo" NOT NULL,

    CONSTRAINT "activos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMPTZ(3) NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "activoId" INTEGER NOT NULL,
    "cantidad" DECIMAL(36,18) NOT NULL,
    "precio" DECIMAL(36,18),
    "moneda" "Moneda" NOT NULL DEFAULT 'USD',
    "comision" DECIMAL(36,18),
    "comisionActivoId" INTEGER,
    "cuentaId" INTEGER NOT NULL,
    "cuentaDestinoId" INTEGER,
    "estrategia" TEXT,
    "nota" TEXT,
    "creadoEn" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_nombre_key" ON "cuentas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "activos_simbolo_key" ON "activos"("simbolo");

-- CreateIndex
CREATE INDEX "movimientos_fecha_idx" ON "movimientos"("fecha");

-- CreateIndex
CREATE INDEX "movimientos_activoId_fecha_idx" ON "movimientos"("activoId", "fecha");

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "activos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_comisionActivoId_fkey" FOREIGN KEY ("comisionActivoId") REFERENCES "activos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_cuentaDestinoId_fkey" FOREIGN KEY ("cuentaDestinoId") REFERENCES "cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================
-- Reglas de negocio (escritas a mano: Prisma no sabe generar CHECKs).
-- Postgres rechaza cualquier INSERT/UPDATE que las rompa, venga de
-- donde venga (la app, un import, un script o alguien con psql).
-- =====================================================================

-- La cantidad es siempre positiva; solo PNL_FUTUROS lleva signo.
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_cantidad_signo_chk"
    CHECK ("cantidad" > 0 OR ("tipo" = 'PNL_FUTUROS' AND "cantidad" <> 0));

-- Compras y ventas siempre tienen precio.
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_precio_requerido_chk"
    CHECK ("tipo" NOT IN ('COMPRA', 'VENTA') OR "precio" IS NOT NULL);

-- Precio y comisión nunca negativos.
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_precio_no_negativo_chk"
    CHECK ("precio" IS NULL OR "precio" >= 0);
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_comision_no_negativa_chk"
    CHECK ("comision" IS NULL OR "comision" >= 0);

-- Si hay comisión, tiene que decir en qué activo se cobró (y viceversa).
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_comision_activo_chk"
    CHECK (("comision" IS NULL) = ("comisionActivoId" IS NULL));

-- Una TRANSFER tiene destino; ningún otro tipo lo tiene.
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_destino_solo_transfer_chk"
    CHECK (("tipo" = 'TRANSFER') = ("cuentaDestinoId" IS NOT NULL));

-- No se transfiere a la misma cuenta.
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_destino_distinto_chk"
    CHECK ("cuentaDestinoId" IS NULL OR "cuentaDestinoId" <> "cuentaId");
