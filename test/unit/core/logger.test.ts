import Logger from '../../../src/core/logger';
import { LoggingConfig } from '../../../src/types';

describe('Logger Unit Tests', () => {
  let logger: Logger;
  let mockConsole: any;

  beforeEach(() => {
    // Mock console methods
    mockConsole = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
    
    // Replace console methods
    jest.spyOn(console, 'log').mockImplementation(mockConsole.log);
    jest.spyOn(console, 'error').mockImplementation(mockConsole.error);
    jest.spyOn(console, 'warn').mockImplementation(mockConsole.warn);
    jest.spyOn(console, 'debug').mockImplementation(mockConsole.debug);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Logging', () => {
    beforeEach(() => {
      logger = new Logger({ enabled: true, level: 'debug' });
    });

    it('should log info messages', () => {
      logger.info('Test info message');
      
      expect(mockConsole.log).toHaveBeenCalledTimes(1);
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[INFO\] Test info message/)
      );
    });

    it('should log error messages', () => {
      logger.error('Test error message');
      
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[ERROR\] Test error message/)
      );
    });

    it('should log warn messages', () => {
      logger.warn('Test warn message');
      
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[WARN\] Test warn message/)
      );
    });

    it('should log debug messages', () => {
      logger.debug('Test debug message');
      
      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[DEBUG\] Test debug message/)
      );
    });
  });

  describe('Log Levels', () => {
    it('should respect error log level', () => {
      logger = new Logger({ enabled: true, level: 'error' });
      
      logger.error('Error message');
      logger.warn('Warn message');
      logger.info('Info message');
      logger.debug('Debug message');
      
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledTimes(0);
      expect(mockConsole.log).toHaveBeenCalledTimes(0);
      expect(mockConsole.debug).toHaveBeenCalledTimes(0);
    });

    it('should respect warn log level', () => {
      logger = new Logger({ enabled: true, level: 'warn' });
      
      logger.error('Error message');
      logger.warn('Warn message');
      logger.info('Info message');
      logger.debug('Debug message');
      
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.log).toHaveBeenCalledTimes(0);
      expect(mockConsole.debug).toHaveBeenCalledTimes(0);
    });

    it('should respect info log level', () => {
      logger = new Logger({ enabled: true, level: 'info' });
      
      logger.error('Error message');
      logger.warn('Warn message');
      logger.info('Info message');
      logger.debug('Debug message');
      
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.log).toHaveBeenCalledTimes(1);
      expect(mockConsole.debug).toHaveBeenCalledTimes(0);
    });
  });

  describe('Disabled Logging', () => {
    beforeEach(() => {
      logger = new Logger({ enabled: false });
    });

    it('should not log when disabled', () => {
      logger.error('Error message');
      logger.warn('Warn message');
      logger.info('Info message');
      logger.debug('Debug message');
      
      expect(mockConsole.error).toHaveBeenCalledTimes(0);
      expect(mockConsole.warn).toHaveBeenCalledTimes(0);
      expect(mockConsole.log).toHaveBeenCalledTimes(0);
      expect(mockConsole.debug).toHaveBeenCalledTimes(0);
    });
  });

  describe('Metadata Logging', () => {
    beforeEach(() => {
      logger = new Logger({ enabled: true, level: 'debug' });
    });

    it('should include metadata in log messages', () => {
      const meta = { userId: 123, action: 'login' };
      logger.info('User action', meta);
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify(meta, null, 2))
      );
    });

    it('should handle error objects with stack traces', () => {
      logger = new Logger({ enabled: true, includeStack: true });
      const error = new Error('Test error');
      
      logger.error('Error occurred', error);
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('stack')
      );
    });

    it('should not include stack traces when disabled', () => {
      logger = new Logger({ enabled: true, includeStack: false });
      const error = new Error('Test error');
      
      logger.error('Error occurred', error);
      
      const logCall = mockConsole.error.mock.calls[0][0];
      expect(logCall).not.toContain('stack');
    });
  });

  describe('Custom Logger', () => {
    it('should use custom logger when provided', () => {
      const customLogger = jest.fn();
      logger = new Logger({ enabled: true, customLogger });
      
      logger.info('Test message', { data: 'test' });
      
      expect(customLogger).toHaveBeenCalledTimes(1);
      expect(customLogger).toHaveBeenCalledWith(
        'info',
        expect.stringMatching(/\[.*\] \[INFO\] Test message/),
        { data: 'test' }
      );
      expect(mockConsole.log).toHaveBeenCalledTimes(0);
    });
  });

  describe('Request Logging', () => {
    beforeEach(() => {
      logger = new Logger({ 
        enabled: true, 
        logRequests: true,
        includeRequest: true 
      });
    });

    it('should log incoming requests', () => {
      const mockReq = {
        method: 'GET',
        url: '/test',
        get: jest.fn((header) => header === 'User-Agent' ? 'test-agent' : undefined),
        ip: '127.0.0.1',
        requestId: 'req-123',
        headers: { 'content-type': 'application/json' },
        query: { page: 1 },
        params: { id: '123' },
      };
      
      logger.logRequest(mockReq);
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Incoming GET request to /test')
      );
    });

    it('should not log requests when disabled', () => {
      logger = new Logger({ enabled: true, logRequests: false });
      const mockReq = { method: 'GET', url: '/test' };
      
      logger.logRequest(mockReq);
      
      expect(mockConsole.log).toHaveBeenCalledTimes(0);
    });
  });

  describe('Response Logging', () => {
    beforeEach(() => {
      logger = new Logger({ 
        enabled: true, 
        logResponses: true 
      });
    });

    it('should log responses', () => {
      const mockReq = { method: 'GET', url: '/test', requestId: 'req-123' };
      const mockRes = { statusCode: 200 };
      const responseData = { success: true, data: { id: 1 } };
      
      logger.logResponse(mockReq, mockRes, responseData, 150);
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Response sent with status 200')
      );
    });

    it('should not log responses when disabled', () => {
      logger = new Logger({ enabled: true, logResponses: false });
      const mockReq = { method: 'GET', url: '/test' };
      const mockRes = { statusCode: 200 };
      
      logger.logResponse(mockReq, mockRes, {});
      
      expect(mockConsole.log).toHaveBeenCalledTimes(0);
    });
  });

  describe('Event Logging', () => {
    beforeEach(() => {
      logger = new Logger({ enabled: true, level: 'debug' });
    });

    it('should log success events', () => {
      const event = {
        type: 'success' as const,
        statusCode: 200,
        method: 'GET',
        path: '/test',
        requestId: 'req-123',
        timestamp: new Date().toISOString(),
      };
      
      logger.logEvent(event);
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('SUCCESS event')
      );
    });

    it('should log error events', () => {
      const event = {
        type: 'error' as const,
        statusCode: 500,
        method: 'POST',
        path: '/test',
        error: new Error('Test error'),
        timestamp: new Date().toISOString(),
      };
      
      logger.logEvent(event);
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR event')
      );
    });

    it('should log request/response events as debug', () => {
      const event = {
        type: 'request' as const,
        statusCode: 200,
        timestamp: new Date().toISOString(),
      };
      
      logger.logEvent(event);
      
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('REQUEST event')
      );
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(() => {
      logger = new Logger({ enabled: true, level: 'info' });
    });

    it('should update configuration', () => {
      logger.updateConfig({ level: 'error' });
      
      logger.info('Info message');
      logger.error('Error message');
      
      expect(mockConsole.log).toHaveBeenCalledTimes(0);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    it('should merge configuration properly', () => {
      logger.updateConfig({ logRequests: true });
      
      // Original settings should be preserved
      logger.error('Error message');
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined metadata', () => {
      logger = new Logger({ enabled: true });
      
      expect(() => {
        logger.info('Test message', undefined);
      }).not.toThrow();
    });

    it('should handle null error objects', () => {
      logger = new Logger({ enabled: true });
      
      expect(() => {
        logger.error('Test message', null);
      }).not.toThrow();
    });

    it('should handle circular references in metadata', () => {
      logger = new Logger({ enabled: true });
      const circular: any = { prop: 'value' };
      circular.self = circular;
      
      expect(() => {
        logger.info('Test message', { circular });
      }).not.toThrow();
    });
  });
});
