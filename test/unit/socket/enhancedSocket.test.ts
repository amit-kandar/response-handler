import { createSocketHandler } from '../../../src/socket/enhancedSocket';
import { createMockSocket } from '../../helpers/setup';

describe('EnhancedSocketHandler Unit Tests', () => {
  it('should emit success payload to current socket', () => {
    const handler = createSocketHandler({ logging: { enabled: false } });
    const socket = createMockSocket() as any;

    const response = handler.enhance(socket, 'user:update');
    response.ok({ id: 1 }, 'Updated');

    expect(socket.emit).toHaveBeenCalledWith(
      'user:update',
      expect.objectContaining({
        success: true,
        data: { id: 1 },
        message: 'Updated',
      }),
    );
  });

  it('should emit errors with normalized payload', () => {
    const handler = createSocketHandler({
      mode: 'production',
      logging: { enabled: false, includeStack: false },
    });
    const socket = createMockSocket() as any;

    const response = handler.enhance(socket, 'user:error');
    response.error(new Error('Boom'));

    expect(socket.emit).toHaveBeenCalledWith(
      'user:error',
      expect.objectContaining({
        success: false,
        message: 'Boom',
        error: expect.objectContaining({
          message: 'Boom',
        }),
      }),
    );
  });

  it('should target room emissions using toRoom', () => {
    const handler = createSocketHandler({ logging: { enabled: false } });
    const socket = createMockSocket() as any;
    const roomEmitter = { emit: jest.fn() };
    socket.to.mockReturnValue(roomEmitter);

    const response = handler.enhance(socket, 'chat:new');
    response.toRoom('room-1').ok({ text: 'hello' }, 'sent');

    expect(socket.to).toHaveBeenCalledWith('room-1');
    expect(roomEmitter.emit).toHaveBeenCalledWith(
      'chat:new',
      expect.objectContaining({
        success: true,
        data: { text: 'hello' },
      }),
    );
  });

  it('wrapper should catch thrown errors and emit error response', async () => {
    const handler = createSocketHandler({ logging: { enabled: false } });
    const socket = createMockSocket() as any;

    const wrapped = handler.wrapper(async () => {
      throw new Error('Unhandled socket error');
    });

    await wrapped(socket, 'orders:create');

    expect(socket.emit).toHaveBeenCalledWith(
      'orders:create',
      expect.objectContaining({
        success: false,
        message: 'Unhandled socket error',
      }),
    );
  });
});
