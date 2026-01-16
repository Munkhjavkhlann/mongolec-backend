import { config } from '../src/config';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only-32chars';
process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/mongolec_test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Redis
jest.mock('../src/database/redis', () => ({
  redisClient: {
    isHealthy: () => false,
    getClient: () => ({
      set: jest.fn(),
      setex: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      incr: jest.fn(),
      pexpire: jest.fn(),
      pipeline: () => ({
        incr: jest.fn(),
        pexpire: jest.fn(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      }),
    }),
    ping: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(undefined),
  },
}));

// Setup timeout
jest.setTimeout(30000);
