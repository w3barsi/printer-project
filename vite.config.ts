import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const isCloudflare = process.env.CLOUDFLARE_DEPLOY === "true";

export default defineConfig({
  server: {
    host: true,
  },
  ssr: {
    noExternal: ["@convex-dev/better-auth", "radix-ui"],
  },
  plugins: [
    devtools(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart(),
    // https://tanstack.com/start/latest/docs/framework/react/guide/hosting
    ...(isCloudflare ? [cloudflare({ viteEnvironment: { name: "ssr" } })] : [nitro()]),
    viteReact(),
    // https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#react-compiler
    babel({
      presets: [reactCompilerPreset()],
    }),
    tailwindcss(),
  ],
});
