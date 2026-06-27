import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import sequelize from './config/database';
// Change import to use .js file
const productRoutes = require('./routes/products.js');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/products', productRoutes);

app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Textile POS Backend is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Textile POS API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/v1/health',
      products: '/api/v1/products',
      api: '/api/v1'
    }
  });
});

// Sync database and start server
const startServer = async () => {
  try {
    // Sync database (creates tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/v1/health`);
      console.log(`📍 Products API: http://localhost:${PORT}/api/v1/products`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
  }
};

startServer();
