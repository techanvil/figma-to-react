import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["server.ts", "src/**/*.ts"],
  format: ["esm"],
  target: "es2022",
  platform: "node",
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  minify: false,
  bundle: false,
  keepNames: true,
  outDir: "dist",
  external: [
    // External dependencies that should not be bundled
    "express",
    "cors",
    "helmet",
    "compression",
    "express-rate-limit",
    "dotenv",
    "winston",
    "joi",
    "ws",
    "uuid",
    "axios",
  ],
  env: {
    NODE_ENV: process.env.NODE_ENV || "development",
  },
  onSuccess: async () => {
    console.log("✅ Build completed successfully");
  },
});
