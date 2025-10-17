import { Router, Request, Response } from 'express';
import { 
  initializeDatabase, 
  performDatabaseHealthCheck, 
  validateDatabaseSchema 
} from '../utils/database';
import { authenticateToken } from '../middleware/auth';
import { logger } from 'firebase-functions';

const router = Router();

/**
 * GET /admin/health
 * Performs a comprehensive database health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthCheck = await performDatabaseHealthCheck();
    
    res.status(healthCheck.status === 'healthy' ? 200 : 503).json({
      success: healthCheck.status === 'healthy',
      data: healthCheck
    });
    
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Health check failed'
    });
  }
});

/**
 * GET /admin/schema/validate
 * Validates the database schema
 */
router.get('/schema/validate', async (req: Request, res: Response) => {
  try {
    const validation = await validateDatabaseSchema();
    
    res.status(validation.isValid ? 200 : 400).json({
      success: validation.isValid,
      data: validation
    });
    
  } catch (error) {
    logger.error('Schema validation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Schema validation failed'
    });
  }
});

/**
 * POST /admin/initialize
 * Initializes the database with validation and health checks
 * Note: This endpoint is not protected to allow initial setup
 */
router.post('/initialize', async (req: Request, res: Response) => {
  try {
    const result = await initializeDatabase();
    
    res.status(result.success ? 200 : 500).json(result);
    
  } catch (error) {
    logger.error('Database initialization failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Database initialization failed'
    });
  }
});

/**
 * GET /admin/status
 * Returns overall system status including database health
 * Protected endpoint requiring authentication
 */
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const healthCheck = await performDatabaseHealthCheck();
    const schemaValidation = await validateDatabaseSchema();
    
    const systemStatus = {
      timestamp: new Date(),
      database: healthCheck,
      schema: schemaValidation,
      api: {
        status: 'operational',
        version: '1.0.0'
      }
    };
    
    const isHealthy = healthCheck.status === 'healthy' && schemaValidation.isValid;
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: systemStatus
    });
    
  } catch (error) {
    logger.error('System status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'System status check failed'
    });
  }
});

export default router;