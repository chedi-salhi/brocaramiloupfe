import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      // "lcov" ajouté pour que SonarCloud puisse lire la couverture (voir
      // sonar-project.properties : sonar.javascript.lcov.reportPaths).
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/app/**/*.tsx"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // "next" installé ne résout pas ce sous-chemin dans cet environnement
      // (voir échec constaté) : on pointe directement vers un stub local pour
      // que le spécificateur soit toujours résoluble, puis vi.mock() dans
      // chaque test shadow ce stub avec les assertions voulues.
      "next/navigation": path.resolve(__dirname, "./test/mocks/next-navigation.ts"),
    },
  },
});
