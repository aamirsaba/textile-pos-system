import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
  }

  private initializeMiddlewares(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private initializeRoutes(): void {
    this.app.get('/api/v1/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        message: 'Textile POS Backend is running',
        timestamp: new Date().toISOString()
      });
    });

    this.app.get('/', (_req: Request, res: Response) => {
      res.json({
        name: 'Textile POS API',
        version: '1.0.0',
        status: 'running'
      });
    });
  }

  public listen(port: number): void {
    this.app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  }
}

export default App;
