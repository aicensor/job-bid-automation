import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable server-side Node.js APIs for PDF generation
  serverExternalPackages: ['puppeteer', 'pdf-parse', 'patchright', 'patchright-core', 'better-sqlite3'],
};

export default nextConfig;
