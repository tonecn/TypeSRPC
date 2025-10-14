import { SocketConnection } from "./SocketConnection";

export abstract class SocketClient {
    public abstract connect(url: string): Promise<SocketConnection>;
}

interface SocketClientConstructor {
    new(...args: any[]): SocketClient;
};

let socketClient: SocketClientConstructor | null = null;

export function injectSocketClient(constructor: SocketClientConstructor) {
    socketClient = constructor;
}

export function getSocketClient() {
    if (!socketClient) {
        throw new Error('No SocketClient constructor has been injected')
    }
    return socketClient;
}

export function createSocketClient(...args: any[]): SocketClient {
    const Constructor = getSocketClient();
    return new Constructor(...args);
}