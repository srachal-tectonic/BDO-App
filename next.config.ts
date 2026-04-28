import type { NextConfig } from "next";

// Security headers for all routes
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Google Maps JS API loads its bootstrap from maps.googleapis.com.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "media-src 'self' blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      // PlaceAutocompleteElement issues XHRs to maps/places APIs; static assets come from maps.gstatic.com.
      "connect-src 'self' https://graph.microsoft.com https://maps.googleapis.com https://places.googleapis.com https://maps.gstatic.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(self), geolocation=()'
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  }
];

const nextConfig: NextConfig = {
  // Required for Azure App Service deployment
  output: 'standalone',

  // Prevent bundling of server-side packages that need to be loaded from node_modules
  serverExternalPackages: [
    '@opentelemetry/api',
    '@opentelemetry/sdk-trace-base',
    // Chromium launchers bundle native binaries and resolve them via paths
    // relative to their own package dir. Bundling into .next/server breaks
    // that resolution, so they must be loaded from node_modules at runtime.
    'puppeteer',
    'puppeteer-core',
    '@sparticuz/chromium',
  ],

  // Next's standalone tracer only follows JS imports. @sparticuz/chromium
  // extracts its Chromium binary from a Brotli-compressed tarball under
  // node_modules/@sparticuz/chromium/bin/ at runtime, so we must force
  // those files into the standalone output or the deploy will ship an
  // empty bin/ dir and executablePath() will fail at launch.
  outputFileTracingIncludes: {
    '/api/projects/**': [
      './node_modules/@sparticuz/chromium/bin/**',
    ],
  },

  // Add security headers to all routes
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
