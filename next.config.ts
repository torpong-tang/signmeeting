import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Keep pdfkit unbundled so its embedded font data files resolve at runtime.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
