# TypeSRPC

**TypeSRPC** is a lightweight, type-safe RPC (Remote Procedure Call) framework for TypeScript that enables seamless communication between client and server with full type inference and deep nested method support.

## ✨ Features

- **Full TypeScript Support**: Automatic type inference.
- **Deep Nested API**: Supports arbitrarily nested method structures (e.g., `api.math.utils.absolute()`).
- **Promise-Based**: All remote calls return promises—no callback hell.
- **Pluggable Transport Layer**: Easily swap underlying socket implementations (default: Socket.IO).
- **Access Control**: Built-in access key authentication for secure connections.
- **Lightweight & Zero Boilerplate**: Define your provider once—no need to manually declare RPC interfaces.
- **Bidirectional Communication**: Both client and server can expose and consume APIs.

## 📦 Installation

```bash
npm install typesrpc
# or
yarn add typesrpc
# or
pnpm add typesrpc
```

## 🚀 Quick Start

### 1. Define Your Providers

```ts
// Server-side provider
type ServerProvider = {
  add: (a: number, b: number) => number;
  math: {
    multiply: (a: number, b: number) => number;
    utils: {
      absolute: (num: number) => number;
    };
  };
};

const serverProvider = {
  add(a: number, b: number) { return a + b; },
  math: {
    multiply(a: number, b: number) { return a * b; },
    utils: {
      absolute(num: number) { return Math.abs(num); }
    }
  }
};
```

```ts
// Client-side provider (optional, for bidirectional RPC)
type ClientProvider = {
  getName: () => string;
  sub: {
    getName: () => string;
  };
};

const clientProvider = {
  name: 'Client1',
  getName() { return this.name; },
  sub: {
    name: 'SubClient',
    getName() { return this.name; }
  }
};
```

### 2. Set Up Server & Client

```ts
import { RPCHandler } from 'typesrpc';

// Server
const server = new RPCHandler();
server.setProvider(serverProvider);
await server.listen({ port: 3000 });

// Client
const client = new RPCHandler();
client.setProvider(clientProvider);
const session = await client.connect({ url: 'http://localhost:3000' });

// Get typed API proxies
const serverAPI = session.getAPI<ServerProvider>();
const clientAPI = session.getAPI<ClientProvider>(); // if server also consumes client API
```

### 3. Make Remote Calls

```ts
// All methods return Promises
const sum = await serverAPI.add(2, 3); // 5
const product = await serverAPI.math.multiply(4, 5); // 20
const abs = await serverAPI.math.utils.absolute(-10); // 10

const name = await clientAPI.getName(); // 'Client1'
```

> 💡 **Note**: The `ToDeepPromise<T>` utility (exported internally) automatically converts all synchronous methods in your provider to async (`Promise<T>`), so you can `await` them on the client side.

---

## 🔐 Access Key Authentication

Secure your RPC endpoints with access keys:

### Server (require access key)
```ts
const server = new RPCHandler();
server.setAccessKey('my-secret-key');
await server.listen({ port: 3001 });
```

### Client (provide access key)
```ts
const client = new RPCHandler();
await client.connect({
  url: 'http://localhost:3001',
  accessKey: 'my-secret-key' // required!
});
```

Connections without a valid access key will be rejected.

---

## ⚙️ Custom Socket Implementation

TypeSRPC supports pluggable transport layers. By default, it uses **Socket.IO**, but you can replace it with any real-time communication library (e.g., WebSocket, SignalR, etc.).

### How to Inject a Custom Implementation

1. Implement the required interfaces:
   - `SocketClient`
   - `SocketServer`
   - `SocketConnection`

2. Inject your implementations:

```ts
// my-socket-impl/index.ts
import { injectSocketClient, injectSocketServer } from 'typesrpc';
import { MySocketClient } from './MySocketClient';
import { MySocketServer } from './MySocketServer';

export function injectMySocketImpl() {
  injectSocketClient(MySocketClient);
  injectSocketServer(MySocketServer);
}
```

3. Call the injector **before** creating any `RPCHandler` instances:

```ts
import { injectMySocketImpl } from './my-socket-impl';
injectMySocketImpl(); // Must be called once at app startup

const handler = new RPCHandler(); // Now uses your custom socket layer
```

> ✅ The built-in Socket.IO implementation is injected automatically when you import typesrpc. To override it, call your custom injector before creating any RPCHandler instances (but after importing typesrpc). 

---

## 📁 Project Structure

```
src/
├── core/                 # Core RPC logic (transport-agnostic)
├── implements/           # Transport implementations
│   └── socket.io/        # Default: Socket.IO adapter
├── utils/                # Utilities (e.g., ToDeepPromise, EventEmitter)
└── index.ts              # Public API exports + default Socket.IO injection
```

---

## 🧪 Testing

The project includes comprehensive tests:

- **Unit**: `npm run test:unit`
- **Integration**: `npm run test:integration`
- **E2E**: `npm run test:e2e`
- **Coverage**: `npm run test:coverage`

Run all tests with:
```bash
npm test
```

---

## 📄 API Reference

### `RPCHandler`
Main entry point for both client and server.

- `.setProvider(provider: T)` – Register local methods.
- `.setAccessKey(key: string)` – Set access key (server-side).
- `.listen(options?)` – Start server.
- `.connect(options?)` – Connect to server; returns `Promise<RPCSession>`.

### `RPCSession`
Represents an active RPC connection.

- `.getAPI<T>()` – Get a typed proxy to the remote provider.

---

## 📜 License

MIT License © [tonecn](https://github.com/tonecn)

---

> **Note**: This library is designed for development and internal tooling. For production use in public-facing services, ensure proper authentication, rate limiting, and input validation are implemented on top of the access key mechanism.