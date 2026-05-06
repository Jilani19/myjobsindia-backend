import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import jobRoutes from './routes/jobRoutes';

dotenv.config();

const app = express();

// Environment variables
const PORT = Number(process.env.PORT) || 5000;
const FRONTEND_URL =
  process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect MongoDB
connectDB();

// Routes
app.use('/api/jobs', jobRoutes);

// Root route
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'MyJobsIndia Backend API Running',
  });
});

// Health check route
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    message: 'Job Platform API is running',
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
