const express = require('express');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const actionRoutes = require('./routes/actions');
const categoryRoutes = require('./routes/categories');
const locationRoutes = require('./routes/locations');
const reportRoutes = require('./routes/reports');
const aiRoutes = require('./routes/ai');
const userRoutes = require('./routes/users');
const knowledgeBaseRoutes = require('./routes/knowledgeBase');
const superAdminRoutes = require('./routes/superAdmin');
const tenantAuthRoutes = require('./routes/tenantAuth');
const publicRoutes = require('./routes/public');
const kpiRoutes = require('./routes/kpi');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Connect to the database
connectDB();

// Production-ready CORS configuration
const getAllowedOrigins = () => {
  const origins = [];
  
  // Add environment-specific origins
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(','));
  }
  
  // Development origins (only in development)
  if (process.env.NODE_ENV !== 'production') {
    origins.push(
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://10.41.68.202:3000'
    );
  }
  
  return origins;
};

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'x-tenant-id'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Serve static files from React build (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
}

// Enhanced CORS headers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token, x-tenant-id');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Test route
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'CAS Service Portal Backend is running!',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Public routes (no authentication required) - MUST be before other routes
app.use('/api/public', publicRoutes);

// Multi-tenant routes (must be before generic /api routes)
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/tenant', tenantAuthRoutes);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', userRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/kpi', kpiRoutes);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve React app for all other routes (production)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// Listen on all interfaces for production
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0';
app.listen(port, host, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Host: ${host}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔗 Local access: http://localhost:${port}`);
    console.log(`🔗 Network access: http://10.41.68.202:${port}`);
  }
});
