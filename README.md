# Live Chat Application - Microservices Architecture

A scalable real-time chat application built with **NestJS** using a **Microservices Architecture**. The project is designed with independent services that communicate through message brokers, making the system modular, maintainable, and easy to scale.

---

# Features

- Real-time messaging
- JWT Authentication & Authorization
- User management
- API Gateway
- Microservice Architecture
- RabbitMQ for inter-service communication
- Dockerized services
- Docker Compose support
- PostgreSQL databases
- REST APIs
- Unit & Integration Testing

---

# Tech Stack

- NestJS
- Node.js
- TypeScript
- PostgreSQL
- RabbitMQ
- Docker
- Docker Compose
- JWT Authentication
- TypeORM

---

# Architecture

The application follows a Microservices Architecture where every service has its own responsibility and database.

```text
                                Client
                                   │
                                   │ HTTP
                                   ▼
                          ┌─────────────────┐
                          │   API Gateway   │
                          └─────────────────┘
                             │      │      │
             ┌───────────────┘      │      └───────────────┐
             ▼                      ▼                      ▼
      ┌────────────┐        ┌────────────┐        ┌────────────┐
      │ Auth       │        │ Users      │        │ Chat       │
      │ Service    │        │ Service    │        │ Service    │
      └────────────┘        └────────────┘        └────────────┘
             │                      │                      │
             ▼                      ▼                      ▼
      ┌────────────┐        ┌────────────┐        ┌────────────┐
      │ Auth DB    │        │ Users DB   │        │ Chat DB    │
      └────────────┘        └────────────┘        └────────────┘

                    Services communicate via RabbitMQ
```

---

# Microservices

## API Gateway

The API Gateway is the single entry point for clients. It receives incoming HTTP requests, validates them, and forwards them to the appropriate microservice.

Responsibilities:

- Route client requests
- JWT authentication
- Authorization
- Request validation
- Centralized API endpoint

---

## Authentication Service

Responsible for authentication and security.

Features:

- User login
- User registration
- Password hashing
- JWT generation
- JWT validation

Database:

- Authentication database

---

## Users Service

Responsible for user management.

Features:

- Create users
- Retrieve user information
- Update user profile
- Delete users

Database:

- Users database

---

## Chat Service

Responsible for chat operations.

Features:

- Send messages
- Receive messages
- Store conversations
- Retrieve chat history

Database:

- Chat database

---

# Docker

The entire application is fully **Dockerized**.

Each microservice, database, and RabbitMQ instance runs inside its own Docker container, providing a consistent development environment and simplifying deployment.

To build and start every service:

```bash
docker compose up --build
```

To stop all containers:

```bash
docker compose down
```

---

# Installation

Clone the repository.

```bash
git clone https://github.com/your-username/your-repository.git
```

Install dependencies.

```bash
npm install
```

---

# Running the Application

Start the API Gateway:

```bash
npm run start gateway
```

Start each microservice in a separate terminal:

```bash
npm run start auth
npm run start users
npm run start chat
```

Once all services are running, the application is ready to accept requests through the API Gateway.

---

# Testing

After starting all services, run the tests.

Run all tests:

```bash
npm test
```

Run tests for a specific microservice:

```bash
npm run test:auth
```

```bash
npm run test:users
```

```bash
npm run test:chat
```

If you have integration or end-to-end tests, ensure the API Gateway and all required microservices are running before executing them.

---

# Project Structure

```text
apps/
│
├── gateway/
├── auth/
├── users/
└── chat/

libs/
├── common/
├── database/
└── contracts/

docker-compose.yml
```

---

# Scalability

The project is designed around Microservices principles:

- Independent deployment
- Independent databases
- Loose coupling
- High scalability
- Fault isolation
- Easy maintenance

---

# Future Improvements

- WebSocket support
- Online presence
- Typing indicators
- Read receipts
- File sharing
- Group chats
- Notifications
- Horizontal scaling
- Kubernetes deployment

---

# License

This project is licensed under the MIT License.