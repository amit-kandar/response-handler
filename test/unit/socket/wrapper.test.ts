import socketWrapper from '../../../src/socket/wrapper';
import { createMockSocket } from '../../helpers/setup';

describe('Socket Adapter: wrapper', () => {
  it('should execute successful async handler', async () => {
    const socket = createMockSocket() as any;
    const handler = jest.fn(async () => {});
    const wrapped = socketWrapper(handler);

    await wrapped(socket, { event: 'ok:event', value: 1 });

    expect(handler).toHaveBeenCalledWith(socket, { event: 'ok:event', value: 1 });
    expect(socket.emit).not.toHaveBeenCalledWith('ok:event', expect.objectContaining({ success: false }));
  });

  it('should catch sync handler failures and emit adapter error', async () => {
    const socket = createMockSocket() as any;
    const wrapped = socketWrapper(() => {
      throw new Error('sync fail');
    });

    await wrapped(socket, { event: 'sync:error' });

    expect(socket.emit).toHaveBeenCalledWith('sync:error', {
      success: false,
      message: 'sync fail',
      data: null,
      error: {
        type: 'Error',
        code: undefined,
        details: null,
      },
    });
  });

  it('should fallback to "error" event when no event is provided', async () => {
    const socket = createMockSocket() as any;
    const wrapped = socketWrapper(async () => {
      throw new Error('plain failure');
    });

    await wrapped(socket, {} as any);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      success: false,
      message: 'plain failure',
      data: null,
      error: {
        type: 'Error',
        code: undefined,
        details: null,
      },
    });
  });
});
