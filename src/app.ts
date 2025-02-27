// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import { initDatabase } from './config/database';
import authRoutes from './modules/auth/auth.routes';
import vaultRoutes from './modules/vault/vault.routes';
import errorHandler from './middleware/error.middleware';
import dotenv from 'dotenv';
import './models'; // Import models to initialize associations

dotenv.config();

const app = express();
const port = process.env.PORT || 3000; // Changed back to port 3000

// Enhanced CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://yourdomain.com' 
    : ['http://localhost:4200', 'http://localhost:4000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Apply CORS with options
app.use(cors(corsOptions));

// Other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/vaults', vaultRoutes);

// Add a health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// GitHub status endpoint for frontend check
app.get('/api/vaults/github/status', (req, res) => {
  // This endpoint can be enhanced to actually check GitHub integration status
  res.status(200).json({ connected: true, message: 'GitHub integration is available' });
});

// Error handling middleware
app.use(errorHandler);

const startServer = async () => {
  try {
    await initDatabase();
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
      console.log('Environment:', process.env.NODE_ENV);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
