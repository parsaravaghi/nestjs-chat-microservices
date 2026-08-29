# NestJS Real-Time Chat Microservices

A real-time chat backend built as a NestJS monorepo. Clients use HTTP for authentication and conversation management, and Socket.IO for sending and receiving messages. RabbitMQ connects the API gateway to the auth, users, and chat microservices.

## Features

- JWT authentication using RS256 keys
- User registration and login
- Private, group, and channel conversations
- Cursor-based conversation pagination
- Real-time Socket.IO message delivery and acknowledgments
- Reply-to-message support
- HTTP and WebSocket guards, validation, and structured errors
- Unit, integration, and end-to-end tests

## Architecture

```text
Browser / mobile client
        |
        | HTTP + Socket.IO
        v
API Gateway (:3000)
        |
        | RabbitMQ request/response and events
        +----------------+----------------+
        |                |                |
        v                v                v
 Auth service       Users service     Chat service
 auth_queue          user_queue        chat_queue
        |                |                |
        |                v                v
        |              MySQL            MongoDB
        |                              replica set
        +----------> Users service
```

The API gateway is the only client-facing application. The other applications consume RabbitMQ messages and do not expose HTTP ports.

### Real-time message flow

```text
Socket.IO sendMessage
  -> WebSocket JWT guard and DTO validation
  -> API gateway sends chat.sendMessage through RabbitMQ
  -> ChatService verifies membership and persists the message
  -> API gateway emits newMessage to conversation:<conversationId>
  -> API gateway emits sendMessageAck to the sender
```

The deprecated REST message route uses the same `ChatService.sendMessage()` business logic. REST-originated messages are published back to the gateway through `api_gateway_events_queue`.

## Applications and libraries

| Path | Responsibility |
| --- | --- |
| `apps/api-gateway` | HTTP controllers, Socket.IO gateway, client authentication, RPC forwarding, and transport errors |
| `apps/auth` | Registration, login, password verification, JWT signing, and token validation |
| `apps/users` | User persistence and lookup through TypeORM/MySQL |
| `apps/chat` | Conversation membership and message persistence through Mongoose/MongoDB |
| `libs/constracts` | Shared DTOs, interfaces, enums, RabbitMQ helpers, and event contracts |
| `libs/common` | Shared filters and infrastructure code |
| `libs/database` | Shared database entities |
| `test` | Unit, integration, and end-to-end tests |

> The shared contracts directory is currently named `constracts`. Keep the `@app/constracts` import alias unless it is renamed across the complete monorepo.

## Technology stack

- Node.js, TypeScript, and NestJS 11
- Socket.IO 4
- RabbitMQ
- MongoDB 8 with a replica set
- MySQL 9
- Mongoose and TypeORM
- Jest, Supertest, and `socket.io-client`
- Docker Compose for local infrastructure

## Prerequisites

- Node.js 22, or another version supported by the installed NestJS dependencies
- npm
- Docker Desktop with Docker Compose
- OpenSSL for creating local RS256 keys

## Configuration

Configuration is loaded from the root `.env` and service-specific environment files.

### Root `.env`

Copy `.env.example` to `.env` and configure RabbitMQ:

```dotenv
APP_ENVIROMENT=development
APP_MB_HOST=localhost
APP_MB_PORT=5672
APP_MB_USER=chat
APP_MB_PASSWORD=change-me

RABBITMQ_DEFAULT_USER=chat
RABBITMQ_DEFAULT_PASS=change-me
```

`APP_ENVIROMENT` uses the spelling currently present in the codebase.

### Users database

Copy `apps/users/.env.example` to `apps/users/.env`:

```dotenv
APP_DB_HOST=localhost
APP_DB_PORT=3306
APP_DB_USER=chat
APP_DB_PASSWORD=change-me
APP_DB_NAME=chat_users

MYSQL_USER=chat
MYSQL_PASSWORD=change-me
MYSQL_DATABASE=chat_users
MYSQL_ROOT_PASSWORD=change-root-password
```

TypeORM schema synchronization is enabled when `APP_ENVIROMENT=development`. Use migrations instead of synchronization in production.

### Chat database

Create `apps/chat/.env`:

```dotenv
APP_DB_HOST=localhost
APP_DB_PORT=27017
APP_DB_NAME=chat
APP_DB_USERNAME=chat_root
APP_DB_PASSWORD=change-me

MONGO_INITDB_ROOT_USERNAME=chat_root
MONGO_INITDB_ROOT_PASSWORD=change-me
```

The chat connection includes `replicaSet=rs0` because chat operations use MongoDB transactions.

### JWT keys

Generate an RSA key pair for local development:

```bash
openssl genpkey -algorithm RSA -out jwt-private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in jwt-private.pem -out jwt-public.pem
```

Store both PEM values in `apps/auth/.env`. Represent newlines as `\n`:

```dotenv
APP_JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APP_JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

Never commit real private keys or production credentials.

## Installation and startup

Install dependencies:

```bash
npm install
```

Start RabbitMQ, MySQL, and MongoDB:

```bash
docker compose up -d --build
```

Docker Compose currently starts infrastructure only. Start each NestJS application in a separate terminal:

```bash
npm run start:dev -- api-gateway
npm run start:dev -- auth
npm run start:dev -- users
npm run start:dev -- chat
```

The API gateway listens on port `3000` by default. RabbitMQ management is available at `http://localhost:15672`.

Stop the infrastructure without deleting database volumes:

```bash
docker compose down
```

## HTTP API

Protected routes expect:

```http
Authorization: Bearer <access-token>
```

### Register

```http
POST /auth/register
Content-Type: application/json

{
  "username": "alice",
  "email": "alice@example.com",
  "password": "strong-password"
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "username": "alice",
  "password": "strong-password"
}
```

The response includes an `access_token` for HTTP and Socket.IO clients.

### Current user

```http
GET /auth/me
Authorization: Bearer <access-token>
```

### Create a conversation

```http
POST /chat/conversations
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "type": "private",
  "participantIds": ["other-user-id"]
}
```

Supported type values are `private`, `group`, and `channel`. A private conversation must contain exactly two distinct participants after including the authenticated user. Group and channel conversations require a non-empty `title`.

### List conversations

```http
GET /chat/conversations?limit=20&cursor=<optional-cursor>
Authorization: Bearer <access-token>
```

The response contains `data`, `pagination.hasMore`, and `pagination.nextCursor`. Pass `nextCursor` unchanged to retrieve the next page.

### Deprecated REST message route

```http
POST /chat/conversations/:conversationId/message
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "content": "Hello",
  "replyTo": "optional-message-object-id"
}
```

New clients should use Socket.IO. This route remains available for backward compatibility.

## Socket.IO API

The gateway uses the default `/` namespace and supports `websocket` and `polling` transports.

### Connect and authenticate

Use the Socket.IO handshake `auth` object:

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: accessToken },
  transports: ['websocket'],
});
```

For compatibility, the gateway also accepts `?token=<jwt>` or an `Authorization: Bearer <jwt>` handshake header. The validated JWT payload is attached to `client.data.user`. The socket joins its `user:<userId>` room and existing `conversation:<conversationId>` rooms.

### Send a message

```ts
socket.emit('sendMessage', {
  conversationId: '68b000000000000000000010',
  content: 'Hello from Socket.IO',
  replyTo: undefined,
});
```

`conversationId` and `replyTo` must be MongoDB ObjectIds. `replyTo` is optional.

### Receive messages

Every connected participant in the conversation room receives:

```ts
socket.on('newMessage', (message) => {
  // { id, conversationId, participantId, content, replyTo, createdAt }
});
```

### Sender acknowledgment

```ts
socket.on('sendMessageAck', ({ ok, message }) => {
  // ok is true after persistence and broadcast
});
```

### Errors

Authentication, validation, authorization, and persistence errors use a structured event:

```ts
socket.on('sendMessageError', (error) => {
  // {
  //   code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'MESSAGE_SEND_FAILED' | ...,
  //   message: string,
  //   details?: unknown
  // }
});
```

## RabbitMQ contracts

These are internal service contracts, not public APIs:

| Queue | Patterns |
| --- | --- |
| `auth_queue` | `auth.register`, `auth.login`, `auth.validateToken` |
| `user_queue` | `user.createOne`, `user.findOneBy`, `user.findBy`, `user.findByIds` |
| `chat_queue` | `chat.createConversation`, `chat.myConversations`, `chat.myConversationIds`, `chat.sendMessage` |
| `api_gateway_events_queue` | Conversation-created and message-sent events consumed by the gateway |

Keep transport handlers thin: controllers and gateways validate, authenticate, and delegate; business rules belong in their service classes.

## Testing and code quality

```bash
# Unit, integration, and end-to-end suites
npm test

# Individual suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Other checks
npm run test:watch
npm run build
npm run lint
npm run format
```

The lint script applies automatic fixes. Integration tests require their configured infrastructure. The Socket.IO integration test starts an in-process gateway and uses `socket.io-client` to verify delivery between two clients in one room.

## Project structure

```text
.
|-- apps/
|   |-- api-gateway/
|   |-- auth/
|   |-- chat/
|   `-- users/
|-- libs/
|   |-- common/
|   |-- constracts/
|   `-- database/
|-- test/
|   |-- unit/
|   |-- integration/
|   `-- e2e/
|-- docker-compose.yml
|-- nest-cli.json
`-- package.json
```

## Troubleshooting

### RabbitMQ connection failure

- Confirm `docker compose ps` shows RabbitMQ running.
- Confirm root `APP_MB_*` credentials match `RABBITMQ_DEFAULT_*`.
- Use `localhost` when NestJS runs on the host. Use `rabbitmq` when it runs inside Compose.

### MongoDB transactions are unavailable

The chat database must run as replica set `rs0`. Check that `chat_db` is healthy, `mongo-init` completed, and `APP_DB_HOST` matches the host registered in the replica set.

### Socket.IO connection is unauthorized

- Pass the JWT as `auth.token`; raw tokens and `Bearer <token>` are accepted.
- Ensure the auth service is running because socket tokens are validated through `auth.validateToken`.
- Ensure the configured public key matches the private signing key.

### A client does not receive `newMessage`

- Verify the user is a conversation participant.
- Connect after creating the conversation, or let the conversation-created event join already-connected participant sockets.
- Listen for `sendMessageError` and inspect its code.

## Production notes

- Replace permissive Socket.IO CORS with explicit frontend origins.
- Store JWT keys and credentials in a secrets manager.
- Disable TypeORM synchronization and use migrations.
- Add a shared Socket.IO adapter such as Redis before horizontally scaling the gateway.
- Configure RabbitMQ durability, retry, dead-letter, and monitoring policies.
- Add rate limits for authentication and message events.

## License

This private repository currently declares `UNLICENSED` in `package.json`.
