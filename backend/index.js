const express = require('express');
const path = require('path');
require('dotenv').config();
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const actionRoutes = require('./routes/actions');
const categoryRoutes = require('./routes/categories');
const reportRoutes = require('./routes/reports');
const aiRoutes = require('./routes/ai');
const userRoutes = require('./routes/users');
const kennisbankRoutes = require('./routes/kennisbank');
const scheduleRoutes = require('./routes/schedules');
const cors = require('cors');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3001;

function normalizeOrigin(origin) {
  return origin ? origin.replace(/\/+$/, '') : '';
}

function getAllowedOrigins() {
  const defaults = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://sac.cas-nl.com'
  ];

  const fromEnv = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(item => normalizeOrigin(item.trim()))
    .filter(Boolean);

  return [...new Set([...defaults, ...fromEnv])];
}

const allowedOrigins = getAllowedOrigins();

// Connect to the database
connectDB();

// Production-safe CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, health checks)
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalized = normalizeOrigin(origin);
    if (allowedOrigins.includes(normalized)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/kennisbank', kennisbankRoutes);
app.use('/api/schedules', scheduleRoutes);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Bestand te groot voor deze upload. Probeer een kleiner bestand.' });
    }
    return res.status(400).json({ message: err.message || 'Upload mislukt' });
  }
  if (err && typeof err.message === 'string') {
    if (err.message.includes('Alleen afbeeldingen') || err.message.includes('Multipart')) {
      return res.status(400).json({ message: err.message });
    }
  }
  next(err);
});

// Listen on all interfaces (0.0.0.0) for network access
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📍 Local access: http://localhost:${port}`);
  console.log(`🌐 Allowed CORS origins: ${allowedOrigins.join(', ')}`);
});
