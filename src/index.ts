export { RPCHandler } from "./core/RPCHandler";
export { RPCClient } from "./core/RPCClient";
export { RPCServer } from "./core/RPCServer";
export { RPCConnection } from "./core/RPCConnection";
export { RPC_ERROR_MESSAGES, RPCErrorCode } from "./core/RPCError";
export type { RPCProvider } from './core/RPCProvider';
export type { RPCPacketType } from './core/RPCPacket';
export { RPCPacket } from './core/RPCPacket';
export { RPCSession } from "./core/RPCSession";
export { SocketClient } from "./core/SocketClient";
export { SocketConnection } from "./core/SocketConnection";
export { SocketServer } from "./core/SocketServer";

export { injectSocketClient } from "./core/SocketClient";
export { injectSocketServer } from "./core/SocketServer";
import { injectSocketIOImplements } from "./implements/socket.io";

injectSocketIOImplements();

export {
    injectSocketIOImplements,
}