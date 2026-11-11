# Instrucciones para Claude

- Respondé en español rioplatense (voseo). Tomás es UX/UI semi-senior y está aprendiendo full stack: explicá las decisiones de backend cuando no sean obvias.
- El contexto de inversor y los datos reales **no están en este repo**. Están en el repo privado `finanzas-contexto`. Si está disponible (por ejemplo con `claude --add-dir ../finanzas-contexto`), leé su `perfil/perfil-inversor.md` y `decisiones/`.
- **Este repo es público:** nunca agregues datos financieros reales, saldos, capturas con montos reales, claves de API ni `.env`. Usá datos de prueba inventados y marcados como tales.
- No inventes datos reales: si falta información, preguntá.
- Montos y cantidades siempre en decimal exacto, nunca float.
- La UI nueva sigue el estilo de las páginas que ya existen en la app (skill `crear-pantalla`). Los bocetos de Pencil y las capturas de `design/` están desactualizados: no te bases en ellos.
- Para ubicarte en el código, leé primero `docs/RESUMEN.md` en vez de explorar el repo.
