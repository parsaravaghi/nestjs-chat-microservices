import { UserRole } from '@app/constracts';
import { of, throwError } from 'rxjs';
import {
  AuthenticatedSocket,
  WebSocketAuthMiddleware,
} from '../../../apps/api-gateway/src/common/middlewares/webSocketAuth.middleware';

describe('WebSocketAuthMiddleware', () => {
  const authClient = { send: jest.fn() };
  const chatClient = { send: jest.fn() };
  const middleware = new WebSocketAuthMiddleware(
    authClient as never,
    chatClient as never,
  );

  beforeEach(() => jest.clearAllMocks());

  const createSocket = (authorization?: string): AuthenticatedSocket =>
    ({
      handshake: { headers: { authorization } },
      data: {},
    }) as AuthenticatedSocket;

  it('accepts a valid JWT and stores the validated user ID', async () => {
    const socket = createSocket('Bearer valid-token');
    const next = jest.fn();
    authClient.send.mockReturnValue(
      of({ sub: 'user-id', username: 'user', role: UserRole.USER }),
    );
    chatClient.send.mockReturnValue(of(['conversation-id']));

    await middleware.authenticate(socket, next);

    expect(authClient.send).toHaveBeenCalledWith(
      'auth.validateToken',
      'valid-token',
    );
    expect(socket.data.userId).toBe('user-id');
    expect(socket.data.user).toEqual(
      expect.objectContaining({ sub: 'user-id' }),
    );
    expect(socket.data.conversationIds).toEqual([
      'conversation:conversation-id',
    ]);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a connection without a JWT', async () => {
    const next = jest.fn();

    await middleware.authenticate(createSocket(), next);

    expect(authClient.send).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('rejects a connection when JWT validation fails', async () => {
    const next = jest.fn();
    authClient.send.mockReturnValue(
      throwError(() => new Error('invalid token')),
    );

    await middleware.authenticate(createSocket('Bearer invalid-token'), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
