import { EventEmitter } from "@/utils/EventEmitter";
import { SocketConnection } from "./SocketConnection";

export interface SocketServerBaseEvents {
    connect: SocketConnection;
}

export abstract class SocketServer extends EventEmitter<SocketServerBaseEvents> {
    /** @throws Error */
    public abstract listen(options: {
        port: number;
    }): Promise<void>;
}

interface SocketServerConstructor {
    new(...args: any[]): SocketServer;
};

let socketServer: SocketServerConstructor | null = null;

export function injectSocketServer(constructor: SocketServerConstructor) {
    socketServer = constructor;
}

export function getSocketServer() {
    if (!socketServer) {
        throw new Error('No SocketServer constructor has been injected')
    }
    return socketServer;
}

export function createSocketServer(...args: any[]): SocketServer {
    const Constructor = getSocketServer();
    return new Constructor(...args);
}