# Marca

> **Estado:** Tomás eligió el nombre `Nonio` y el concepto de logo C. La app ya usa un logotipo provisorio hecho con texto y un favicon SVG. Falta dibujar el logo final y completar los chequeos de la sección 2.

## 1. Estrategia

**De dónde viene.** La app reemplaza una planilla que había que sostener a mano: cientos de cambios y precios que se rompían cada vez que una página cambiaba su HTML. El problema no era la falta de datos, sino tener que mantenerlos y no poder confiar en ellos.

**Para quién.** Primero para Tomás. Más adelante, quizás, para inversores que quieran seguir su cartera.

**Promesa.** Tus números están bien, y no tenés que sostenerlos vos.

**Posicionamiento.** Para quien sigue su cartera repartida entre exchanges y mercados, Nonio es el registro único que calcula posiciones y resultados con exactitud, sin mantenimiento manual y sin esconder de dónde sale cada dato.

**Con qué compite.** El rival real es la planilla casera: es flexible y es tuya, pero es frágil. Frente a los trackers y las apps de brokers, que suelen empujar a operar más o mostrar novedades, la diferencia es la sobriedad. Esta lectura sale de conocimiento general, no de un relevamiento.

**Personalidad.** Sobria y exacta, como un buen reloj.

**Valores.**
- **Exactitud:** cada cifra se puede explicar. Los montos se manejan en decimal exacto, nunca en float.
- **Honestidad:** si un dato está viejo o falló, se dice. Por ejemplo, el último precio se muestra con su antigüedad.
- **Calma:** nada compite por tu atención ni te empuja a operar.
- **Autonomía:** tus datos son tuyos. La app corre en local y las claves de exchange son de solo lectura.

**Lo que la marca nunca hace.** Prometer ganancias, usar cohetes o lunas, parecer un casino, celebrar una operación o generar urgencia.

**Bajadas posibles.**
- **Cuentas que cuadran solas.** Es la recomendada: nombra el dolor original.
- **Tus números, exactos.** Más directa, pero menos distintiva.
- **Lo exacto, sin planilla.** Tiene gracia, aunque depende de que el lector venga de una planilla.

## 2. Nombre

El nombre elegido es **Nonio**. Esta es la comparación que llevó a elegirlo, con los resultados de una búsqueda inicial del 6 de noviembre de 2026.

| Nombre | Qué significa | A favor | En contra |
|---|---|---|---|
| **Nonio** | Escala de un calibre que permite leer fracciones que una regla común no muestra | Es corto, buscable y da una idea de logo. La búsqueda no encontró apps financieras con ese nombre | Hay que explicarlo. Puede sonar a "nono". Hay un servicio portugués de login para medios con ese nombre (dato de memoria, sin verificar) |
| **Fiel** | Aguja de la balanza; también, "exacto" y "leal" | Es la historia más linda y se entiende sin explicación | Choca con la Fundación FIEL, centro argentino de estudios económicos, y con la antigua firma electrónica FIEL de México (ambos datos de memoria, sin verificar) |
| **Tara** | Lo que se descuenta para obtener el peso neto; "tarar" es llevar la balanza a cero | Es corta e internacional | Muy común y difícil de encontrar en buscadores. También es nombre de persona |
| **Aplomo** | Serenidad; viene de la plomada, que marca la vertical exacta | Transmite el tono justo | Habla más de calma que de exactitud, y es más larga |
| **Cuadra** | "Las cuentas cuadran" | Conecta directo con la promesa | En Argentina, se lee primero como "cuadra de barrio". Suena igual que Kuadra, fintech colombiana |

**Dominios.** `.com` y `.app` están registrados para los cinco nombres. Para Nonio, `getnonio.com`, `usenonio.com`, `nonio.finance` y `nonio.money` no devolvieron registro en RDAP, así que parecen libres (conviene confirmarlo en un registrador). No hace falta comprar nada mientras la app corra en local.

**Chequeos pendientes:**
- [ ] Buscar la marca en el INPI (Argentina). No se hizo.
- [ ] Revisar App Store, Google Play y redes. No se hizo.
- [ ] Probar con alguien de afuera: ¿lo puede escribir después de escucharlo una vez?
- [ ] Si la app llega a salir al público, hacer una verificación legal real.

## 3. Voz

Nonio habla como un buen contador: dice lo justo, con precisión, sin alarmar ni festejar.

**Reglas**
- **Primero el dato, después la explicación.** Frases cortas y voz activa.
- **Voseo rioplatense**, con un registro neutro.
- **Sin exclamaciones ni humor.** Tampoco en la interfaz.
- **El resultado no se juzga.** Una pérdida se informa igual que una ganancia.
- **Toda incertidumbre se declara.** Se indica la antigüedad o el origen del dato.
- **Sin recomendaciones.** La app muestra, no aconseja.

**Palabras**
- **Usamos:** registro, movimiento, posición, precio promedio, resultado, realizado, no realizado, exposición, actualizado, importar.
- **Evitamos:** ganá, oportunidad, explotá, to the moon, inteligente, potenciá, fácil, simplemente, increíble, felicitaciones.

**Ejemplos en pantalla** (cifras inventadas)

| Situación | Fuera de tono | En tono |
|---|---|---|
| Falla la API de precios | ¡Ups! Algo salió mal | No se pudo actualizar el precio. Se muestra el último, de hace 12 min. |
| Importación de CSV | ¡Listo! Tu archivo se subió con éxito | Se importaron 120 movimientos. Se saltearon 3. Ver cuáles |
| Estado vacío | ¡Empezá tu camino como inversor! | Todavía no hay movimientos. Importá un CSV o cargá el primero. |
| Mes con pérdida | Mal mes, ¡pero no te rindas! | Resultado del mes: −2,4 % |
| Mes con ganancia | ¡Excelente, sos un crack! | Resultado del mes: +2,4 % |
| Fila inválida | Error de datos | Fila 14: falta la fecha. |
| Datos sincronizados | ¡Todo al día! | Actualizado hace 2 min |

## 4. Dirección visual

La identidad parte de lo que ya existe en `apps/web/src/styles/_tokens.scss`, que ya va en este sentido. No hace falta rediseñar.

**Idea central: la coincidencia.** En un nonio, la medida exacta se lee donde dos líneas coinciden. Esa imagen sostiene el logo y la manera de usar el acento: una sola cosa marcada por vez.

**Color.** El contraste se calculó sobre fondo blanco salvo donde se aclara; todos superan AA (4,5:1) para texto normal.

| Rol | Token | Valor | Contraste |
|---|---|---|---|
| Tinta | `--color-text` | `#0a0a0a` | 19,80 |
| Texto secundario | `--color-muted` | `#5f6368` | 6,05 (5,49 sobre `#f2f4f7`) |
| Superficie | `--color-surface` | `#ffffff` | — |
| Fondo | `--color-ground` | `#f2f4f7` | — |
| Acento "azul escala" | `--color-chart` | `#1d5fbf` | 6,10 (5,54 sobre `#f2f4f7`) |
| Positivo | `--color-positive` | `#247b50` | 5,22 |
| Negativo | `--color-negative` | `#c4242a` | 5,78 |

**Reglas de color**
- El 90 % de la interfaz es neutra. El acento marca solo una cosa por vez o un dato de un gráfico.
- Verde y rojo se reservan para resultados, nunca para decorar o para botones. Siempre van con signo (+/−), para no depender solo del color.

**Tipografía.** Geist, la que ya usa la app.
- Títulos y texto: Geist 400 y 500.
- Números: siempre con cifras tabulares (`font-variant-numeric: tabular-nums`), como ya hacen las tablas de posiciones y movimientos. Falta extenderlo al resto de las cifras.
- Decimales alineados y con precisión constante dentro de una misma columna.

**Forma**
- **Iconos:** lineales, de trazo fino y puntas rectas.
- **Imágenes:** sin fotos de stock, monedas 3D ni gráficos subiendo. La "imagen" de la marca son sus números y sus escalas.
- **Movimiento:** breve y funcional. Sin confeti ni contadores animados: un número que cambia no se dramatiza.

**Logo: concepto C, solo palabra** (Tomás dibuja la versión final en Pencil)
- **Logotipo:** "nonio" en minúscula, con el punto de la "i" reemplazado por una marca de escala azul (`#1d5fbf`).
- **Símbolo para favicon e ícono:** la "i" sola, con su marca azul, en `apps/web/public/favicon.svg`.
- **Sobre fondo oscuro:** el favicon usa trazo blanco y marca `#86abe2`. Falta definir el logotipo completo sobre oscuro y su versión a una tinta.
- **Descartados:** A (dos escalas que coinciden) y B (letra "n" con línea de medición).

**Referencias para mirar.** Braun por el rigor constructivo, NOMOS Glashütte por la sobriedad relojera y las escalas de los instrumentos Mitutoyo como lenguaje gráfico.

**A evitar.** Toros, flechas ascendentes, escudos, bóvedas, monedas, degradados, y el símbolo ₿ o el dorado cripto.
