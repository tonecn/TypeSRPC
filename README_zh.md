# TypeSRPC

**TypeSRPC** 是一个轻量级、类型安全的 TypeScript RPC（远程过程调用）框架，支持客户端与服务器之间的无缝通信，并提供完整的类型推断和深度嵌套方法支持。

## ✨ 特性

- **完整的 TypeScript 支持**：自动类型推断。
- **深度嵌套 API**：支持任意层级嵌套的方法结构（例如 `api.math.utils.absolute()`）。
- **基于 Promise**：所有远程调用均返回 Promise，告别回调地狱。
- **可插拔传输层**：轻松更换底层 socket 实现（默认使用 Socket.IO）。
- **访问控制**：内置访问密钥认证，保障连接安全。
- **轻量且零样板代码**：只需定义一次服务提供者，无需手动声明 RPC 接口。
- **双向通信**：客户端和服务器均可暴露和调用对方的 API。

## 📦 安装

```bash
npm install @tonecn/typesrpc
# 或
yarn add @tonecn/typesrpc
# 或
pnpm add @tonecn/typesrpc
```

## 🚀 快速开始

### 1. 定义你的服务提供者

```ts
// 服务端提供者
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
// 客户端提供者（可选，用于双向 RPC）
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

### 2. 设置服务端与客户端

```ts
import { RPCHandler } from '@tonecn/typesrpc';

// 服务端
const server = new RPCHandler();
server.setProvider(serverProvider);
await server.listen({ port: 3000 });

// 客户端
const client = new RPCHandler();
client.setProvider(clientProvider);
const session = await client.connect({ url: 'http://localhost:3000' });

// 获取带类型的 API 代理
const serverAPI = session.getAPI<ServerProvider>();
const clientAPI = session.getAPI<ClientProvider>(); // 如果服务端也需要调用客户端 API
```

### 3. 发起远程调用

```ts
// 所有方法均返回 Promise
const sum = await serverAPI.add(2, 3); // 5
const product = await serverAPI.math.multiply(4, 5); // 20
const abs = await serverAPI.math.utils.absolute(-10); // 10

const name = await clientAPI.getName(); // 'Client1'
```

> 💡 **提示**：内部导出的工具类型 `ToDeepPromise<T>` 会自动将你提供者中的所有同步方法转换为异步方法（返回 `Promise<T>`），因此你可以在客户端直接使用 `await`。

---

## 🔐 访问密钥认证

通过访问密钥保护你的 RPC 端点：

### 服务端（要求访问密钥）
```ts
const server = new RPCHandler();
server.setAccessKey('my-secret-key');
await server.listen({ port: 3001 });
```

### 客户端（提供访问密钥）
```ts
const client = new RPCHandler();
await client.connect({
  url: 'http://localhost:3001',
  accessKey: 'my-secret-key' // 必填！
});
```

未提供有效访问密钥的连接将被拒绝。

---

## ⚙️ 自定义 Socket 实现

TypeSRPC 支持可插拔的传输层。默认使用 **Socket.IO**，但你可以替换为任意实时通信库（如原生 WebSocket、SignalR 等）。

### 如何注入自定义实现

1. 实现以下接口：
   - `SocketClient`
   - `SocketServer`
   - `SocketConnection`

2. 注入你的实现：

```ts
// my-socket-impl/index.ts
import { injectSocketClient, injectSocketServer } from '@tonecn/typesrpc';
import { MySocketClient } from './MySocketClient';
import { MySocketServer } from './MySocketServer';

export function injectMySocketImpl() {
  injectSocketClient(MySocketClient);
  injectSocketServer(MySocketServer);
}
```

3. 在创建任何 `RPCHandler` 实例**之前**调用注入器：

```ts
import { injectMySocketImpl } from './my-socket-impl';
injectMySocketImpl(); // 必须在应用启动时调用一次

const handler = new RPCHandler(); // 现在使用你的自定义 socket 层
```

> ✅ 内置的 Socket.IO 实现在你导入 typesrpc 时会自动注入。若要覆盖它，请在创建任何 `RPCHandler` 实例之前（但在导入 typesrpc 之后）调用你的自定义注入器。

---

## 📁 项目结构

```
src/
├── core/                 # 核心 RPC 逻辑（与传输层无关）
├── implements/           # 传输层实现
│   └── socket.io/        # 默认：Socket.IO 适配器
├── utils/                # 工具函数（如 ToDeepPromise、EventEmitter）
└── index.ts              # 公共 API 导出 + 默认 Socket.IO 注入
```

---

## 🧪 测试

项目包含全面的测试：

- **单元测试**：`npm run test:unit`
- **集成测试**：`npm run test:integration`
- **端到端测试**：`npm run test:e2e`
- **覆盖率**：`npm run test:coverage`

运行全部测试：
```bash
npm test
```

---

## 📄 API 参考

### `RPCHandler`
客户端和服务端的主入口。

- `.setProvider(provider: T)` – 注册本地方法。
- `.setAccessKey(key: string)` – 设置访问密钥（服务端）。
- `.listen(options?)` – 启动服务端。
- `.connect(options?)` – 连接服务端；返回 `Promise<RPCSession>`。

### `RPCSession`
表示一个活跃的 RPC 连接。

- `.getAPI<T>()` – 获取远程提供者的类型化代理。

---

## 📜 许可证

MIT 许可证 © [tonecn](https://github.com/tonecn)

---

> **注意**：本库适用于开发和内部工具场景。若用于面向公众的生产服务，请在访问密钥机制之上额外实现完善的认证、限流和输入验证措施。