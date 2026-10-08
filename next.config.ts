import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root. Without this, Turbopack can pick up a stray
  // package-lock.json higher up (e.g. in C:\Users\<you>) and treat your whole
  // user folder as the workspace, which slows builds and confuses resolution.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // PDF libraries are browser-only (they run when someone clicks "Download PDF").
  // Keep them out of the server bundle so the server never compiles jsPDF's
  // Node build and its canvg/@babel/runtime dependency chain.
  serverExternalPackages: ["jspdf", "jspdf-autotable", "canvg"],
};

export default nextConfig;
