-- Un SALDO puede ser 0: "esta cuenta ya no tiene este activo" (por ejemplo, después de retirarlo todo).
-- El resto sigue igual: cantidad positiva, salvo PNL_FUTUROS, que lleva signo.
ALTER TABLE "movimientos" DROP CONSTRAINT "movimientos_cantidad_signo_chk";
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_cantidad_signo_chk"
    CHECK ("cantidad" > 0 OR ("tipo" = 'PNL_FUTUROS' AND "cantidad" <> 0) OR ("tipo" = 'SALDO' AND "cantidad" = 0));
