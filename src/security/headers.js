const helmet = require('helmet');

// Security headers untuk semua respons, termasuk file statis.
// CSP sengaja ketat: hanya skrip, gaya, font, dan gambar dari origin sendiri,
// tanpa inline script maupun inline style, dan tanpa CDN pihak ketiga.
function securityHeaders(config) {
  const directives = {
    defaultSrc: ["'none'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'", 'data:'],
    fontSrc: ["'self'"],
    connectSrc: ["'self'"],
    manifestSrc: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'none'"],
    objectSrc: ["'none'"],
  };
  if (config.isProduction) directives.upgradeInsecureRequests = [];

  const helmetMiddleware = helmet({
    contentSecurityPolicy: { useDefaults: false, directives },
    // HSTS hanya berarti di HTTPS; saat development dibiarkan mati agar
    // pengujian lewat http://localhost atau IP LAN tidak terganggu.
    strictTransportSecurity: config.isProduction
      ? { maxAge: 180 * 24 * 60 * 60, includeSubDomains: false }
      : false,
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginEmbedderPolicy: false,
  });

  return [
    helmetMiddleware,
    (req, res, next) => {
      res.set(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), interest-cohort=()'
      );
      next();
    },
  ];
}

module.exports = { securityHeaders };
