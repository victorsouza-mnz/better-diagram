import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages de projeto serve em <usuário>.github.io/better-diagram/, não na
// raiz — sem o `base`, os assets do build pedem `/assets/...` e voltam 404. Só se
// aplica no build de produção (a env do GitHub Actions); `vite`/`vitest` locais
// continuam na raiz.
const base = process.env.GITHUB_ACTIONS ? "/better-diagram/" : "/";

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    // Os testes de domínio rodam em Node puro, sem jsdom — é o teste de que a
    // regra da dependência continua de pé.
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
