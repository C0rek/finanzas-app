import { defineConfig } from "vitest/config";

// Los tests usan SIEMPRE una base aparte: nunca la que tiene tus datos reales.
const urlTest =
  process.env.TEST_DATABASE_URL ?? "postgresql://finanzas:finanzas_dev@localhost:5432/finanzas_test";

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts", "test/**/*.spec.ts"],
    globalSetup: ["./test/preparar-base.ts"],
    env: { DATABASE_URL: urlTest },
    // Los archivos comparten la misma base: si corrieran en paralelo, se pisarían.
    fileParallelism: false,
  },
});
