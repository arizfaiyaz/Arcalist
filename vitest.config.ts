import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode ?? "test", process.cwd(), "VITE_");
  const supabaseUrl =
    env.VITE_SUPABASE_URL || "https://example.supabase.co";
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || "test-anon-key";

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey),
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./tests/setup/vitest.setup.ts"],
      globals: true,
      css: true,
      restoreMocks: true,
      include: [
        "tests/unit/**/*.test.{ts,tsx}",
        "tests/integration/**/*.test.{ts,tsx}",
        "tests/perf/**/*.test.{ts,tsx}",
      ],
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "lcov"],
        exclude: ["tests/**", "src/**/*.d.ts"],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});