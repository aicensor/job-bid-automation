import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable server-side Node.js APIs for PDF generation
  serverExternalPackages: ['puppeteer', 'pdf-parse', 'patchright', 'patchright-core'],
};

export default nextConfig;
