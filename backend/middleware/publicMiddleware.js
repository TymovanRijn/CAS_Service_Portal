const rateLimit = require('express-rate-limit');

// Rate limiting for public routes
const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health'
});

// Input validation middleware for public routes
const validateTenantQuery = (req, res, next) => {
  const { active } = req.query;
  
  if (active !== undefined && !['true', 'false'].includes(active)) {
    return res.status(400).json({ 
      message: 'Invalid active parameter. Must be "true" or "false".' 
    });
  }
  
  next();
};

// Security headers middleware for public routes
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy for public routes
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;");
  
  // Cache control for public API responses
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
  
  next();
};

// Error handling middleware for public routes
const publicErrorHandler = (err, req, res, next) => {
  console.error('Public route error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: 'Invalid input data',
      errors: err.errors 
    });
  }
  
  if (err.name === 'RateLimitExceeded') {
    return res.status(429).json({ 
      message: 'Too many requests',
      retryAfter: err.retryAfter 
    });
  }
  
  // Default error response
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

// Request logging middleware for public routes
const publicRequestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[PUBLIC] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

module.exports = {
  publicRateLimiter,
  validateTenantQuery,
  securityHeaders,
  publicErrorHandler,
  publicRequestLogger
}; 