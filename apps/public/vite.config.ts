import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const isCloudflare = process.env.CLOUDFLARE_DEPLOY === "true";

export default defineConfig({
  envDir: "../..",
  publicDir: "../../public",
  server: {
    host: true,
  },
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    ...(isCloudflare ? [cloudflare({ viteEnvironment: { name: "ssr" } })] : [nitro()]),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
});
