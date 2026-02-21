import { sendSuccess, sendError } from '../../../src/rest/response';
import { createMockResponse, TestError } from '../../helpers/setup';

describe('REST Adapter: response', () => {
  it('sendSuccess should return 200 formatted payload', () => {
    const res = createMockResponse() as any;

    sendSuccess(res, { id: 1 }, 'ok');

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'ok',
      data: { id: 1 },
      error: null,
    });
  });

  it('sendError should use statusCode from error', () => {
    const res = createMockResponse() as any;
    const err = new TestError('Invalid input', 422, {
      type: 'ValidationError',
      code: 'VALIDATION_ERROR',
      details: { field: 'email' },
    });

    sendError(res, err);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid input',
      data: null,
      error: {
        type: 'ValidationError',
        code: 'VALIDATION_ERROR',
        details: { field: 'email' },
      },
    });
  });

  it('sendError should normalize unknown errors and default to 500', () => {
    const res = createMockResponse() as any;

    sendError(res, 'boom');

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'boom',
      data: null,
      error: {
        type: 'AppError',
        code: undefined,
        details: null,
      },
    });
  });
});
