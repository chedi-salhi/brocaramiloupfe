import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Un package-lock.json existe aussi dans C:\Users\Chedi Salhi (hors projet) ;
  // sans ça, Next.js hésite sur la racine du workspace.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
