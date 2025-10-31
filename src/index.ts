// import 'module-alias/register';
import { config } from './config';
import { GraphQLServer } from './server';
import { createLogger } from './utils/logger';

const logger = createLogger('MAIN');

/**
 * Main application entry point
 * Initializes and starts the GraphQL server with graceful shutdown handling
 */
async function main() {
  try {
    logger.info('Starting Mongolec GraphQL Backend', {
      environment: config.env,
      port: config.port,
      version: process.env.npm_package_version || '1.0.0',
    });

    // Create server instance
    const server = new GraphQLServer();

    // Start the server
    await server.start();

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      try {
        await server.stop();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error as Error);
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', new Error(String(reason)), {
        promise: promise.toString(),
      });
      process.exit(1);
    });

    logger.info('🚀 Mongolec GraphQL Backend is ready!');
    
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    console.error('FULL ERROR:', error);
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});