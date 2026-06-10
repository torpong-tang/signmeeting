import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath,
  output: "standalone",
  reactCompiler: true,
  // Keep pdfkit unbundled so its embedded font data files resolve at runtime.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
