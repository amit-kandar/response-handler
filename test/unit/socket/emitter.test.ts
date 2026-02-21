import { emitSuccess, emitError } from '../../../src/socket/emitter';
import { createMockSocket } from '../../helpers/setup';

describe('Socket Adapter: emitter', () => {
  it('emitSuccess should emit to source socket by default', () => {
    const socket = createMockSocket() as any;

    emitSuccess({ socket, event: 'user:created', data: { id: 1 }, message: 'created' });

    expect(socket.emit).toHaveBeenCalledWith('user:created', {
      success: true,
      message: 'created',
      data: { id: 1 },
      error: null,
    });
  });

  it('emitSuccess should emit to room when provided', () => {
    const socket = createMockSocket() as any;
    const roomEmitter = { emit: jest.fn() };
    socket.to.mockReturnValue(roomEmitter);

    emitSuccess({ socket, event: 'room:event', data: { ok: true }, room: 'room-1' });

    expect(socket.to).toHaveBeenCalledWith('room-1');
    expect(roomEmitter.emit).toHaveBeenCalledWith('room:event', expect.any(Object));
  });

  it('emitError should normalize Error instances', () => {
    const socket = createMockSocket() as any;

    emitError({ socket, event: 'user:error', error: new Error('boom') });

    expect(socket.emit).toHaveBeenCalledWith('user:error', {
      success: false,
      message: 'boom',
      data: null,
      error: {
        type: 'Error',
        code: undefined,
        details: null,
      },
    });
  });

  it('emitError should route to socketId target', () => {
    const socket = createMockSocket() as any;
    const targetEmitter = { emit: jest.fn() };
    socket.to.mockReturnValue(targetEmitter);

    emitError({
      socket,
      event: 'target:error',
      socketId: 'socket-2',
      error: { message: 'failed', type: 'CustomError', code: 'E_CUSTOM' },
    });

    expect(socket.to).toHaveBeenCalledWith('socket-2');
    expect(targetEmitter.emit).toHaveBeenCalledWith('target:error', {
      success: false,
      message: 'failed',
      data: null,
      error: {
        type: 'CustomError',
        code: 'E_CUSTOM',
        details: null,
      },
    });
  });
});
