import errorHandler from '../../../src/rest/errorHandler';
import { createMockRequest, createMockResponse, TestError } from '../../helpers/setup';

describe('REST Adapter: errorHandler', () => {
  it('should delegate to sendError when headers are not sent', () => {
    const req = createMockRequest() as any;
    const res = createMockResponse() as any;
    const next = jest.fn();

    errorHandler(new TestError('Bad request', 400), req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next when headers were already sent', () => {
    const req = createMockRequest() as any;
    const res = createMockResponse() as any;
    res.headersSent = true;
    const next = jest.fn();
    const err = new Error('late failure');

    errorHandler(err, req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
