import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  },
  // Ensure server-only Node.js builtins are never bundled for the browser
  serverExternalPackages: [],
  // Fix workspace root detection when multiple package-lock.json exist
  outputFileTracingRoot: __dirname
};

export default nextConfig;
