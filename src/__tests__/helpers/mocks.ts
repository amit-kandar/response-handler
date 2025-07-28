import { Response } from 'express';
import { Socket } from 'socket.io';

// Mock Express Response
export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock Socket.IO Socket
export const createMockSocket = (): Partial<Socket> => {
  const socket: Partial<Socket> = {};
  socket.emit = jest.fn();
  socket.to = jest.fn().mockReturnValue({
    emit: jest.fn(),
  });
  return socket;
};

// Sample test data
export const sampleUserData = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
};

export const sampleErrorData = {
  message: 'Test error message',
  type: 'TestError',
  details: { field: 'username' },
};

// Mock error classes
export class MockAppError extends Error {
  type: string;
  details: any;
  statusCode: number;

  constructor(message = 'Test error', statusCode = 400, type = 'AppError', details = {}) {
    super(message);
    this.type = type;
    this.details = details;
    this.statusCode = statusCode;
  }
}

export class MockValidationError extends MockAppError {
  constructor(details = {}) {
    super('Validation error', 422, 'ValidationError', details);
  }
}

export class MockNotFoundError extends MockAppError {
  constructor(details = {}) {
    super('Not found', 404, 'NotFoundError', details);
  }
}
