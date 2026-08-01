import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://eraliev.com",
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
});
