import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fija la raíz del proyecto para que Turbopack no busque lock files más arriba.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  experimental: {
    // Las nóminas en PDF (hasta 10 MB) y las fotos de empleados viajan por server actions.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
