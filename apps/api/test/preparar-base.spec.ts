import { describe, expect, it } from "vitest";
import { asegurarBaseDeTest } from "./preparar-base.js";

describe("asegurarBaseDeTest", () => {
  it("rechaza una base que no termina en _test", () => {
    expect(() => asegurarBaseDeTest("postgresql://u:p@localhost:5432/finanzas")).toThrow(/_test/);
  });

  it("acepta una base que termina en _test", () => {
    expect(() => asegurarBaseDeTest("postgresql://u:p@localhost:5432/finanzas_test")).not.toThrow();
  });

  it("mira el nombre de la base, no el resto de la URL", () => {
    expect(() => asegurarBaseDeTest("postgresql://u_test:p@localhost:5432/finanzas?x=_test")).toThrow(/_test/);
  });
});
