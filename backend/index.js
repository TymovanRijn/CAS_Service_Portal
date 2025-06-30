const express = require('express');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const actionRoutes = require('./routes/actions');
const categoryRoutes = require('./routes/categories');
const reportRoutes = require('./routes/reports');
const aiRoutes = require('./routes/ai');
const userRoutes = require('./routes/users');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Connect to the database
connectDB();

// Network-friendly CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'http://10.41.68.202:3000',  // Je netwerk IP
    /^http:\/\/192\.168\.\d+\.\d+:3000$/,  // Lokale netwerk range
    /^http:\/\/10\.\d+\.\d+\.\d+:3000$/    // Andere lokale netwerk ranges
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Enhanced CORS headers for network access
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000', 
    'http://10.41.68.202:3000'
  ];
  
  // Allow any local network origin for development
  if (origin && (allowedOrigins.includes(origin) || 
      origin.match(/^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):3000$/))) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'CAS Service Portal Backend is running!' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', userRoutes);
app.use('/api', categoryRoutes);

// Listen on all interfaces (0.0.0.0) for network access
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📍 Local access: http://localhost:${port}`);
  console.log(`🌐 Network access: http://10.41.68.202:${port}`);
  console.log(`🔗 Test the server at: http://10.41.68.202:${port}`);
});
