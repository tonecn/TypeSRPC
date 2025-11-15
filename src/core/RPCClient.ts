import { isHandshakeAccepted, makeHandshakePacket } from "./RPCCommon";
import { RPCConnection } from "./RPCConnection";
import { RPCHandler } from "./RPCHandler";
import { RPCPacket } from "./RPCPacket";
import { RPCSession } from "./RPCSession";
import { createSocketClient } from "./SocketClient";
import { SocketConnection } from "./SocketConnection";

export class RPCClient {

    constructor(private rpcHandler: RPCHandler) { }

    public async connect(options: {
        url: string;
        accessKey?: string;
        timeout: number;
    }): Promise<RPCSession> {
        // make socket connection
        const socket = createSocketClient();

        // handshake by socket
        const thisAccessKey = this.rpcHandler.getAccessKey();
        /** set 'null' is to make sure all property will not be remove in network transmission */
        const handshakePacket = makeHandshakePacket({
            state: 0,
            thisAccessKey: thisAccessKey || null,
            accessKey: options.accessKey || null,
        });

        /** send handshake request */
        const finalClearFns: (() => any | Promise<any>)[] = [];
        async function finalClear() {
            for (const fn of finalClearFns) {
                try { await fn() } catch { }
            }
        }
        let connection: SocketConnection | undefined;

        // task1: timeout
        let isTimeouted = false;
        const timeoutPromise = new Promise<never>((_, reject) => {
            let t = setTimeout(async () => {
                if (isRequestFinished) {
                    return;
                }

                reject(new Error('Connect timeout'));
            }, options.timeout);

            finalClearFns.push(() => {
                clearTimeout(t);
            })
        })

        // task2: send and wait for response
        let isRequestFinished = false;
        let requestPromise = new Promise<RPCSession>(async (resolve, reject) => {
            /** timeout, but connection is still keep */
            finalClearFns.push(() => {
                if (isTimeouted && connection) {
                    connection.close().catch(e => { })
                }
            })

            /** clear listener of waiting for response */
            finalClearFns.push(() => {
                if (connection) {
                    connection.off('msg', handleListenHandshakeReply);
                }
            })

            connection = await socket.connect(options.url);
            if (isTimeouted) {
                return;
            }

            const handleListenHandshakeReply = (msg: unknown) => {
                const packet = RPCPacket.Parse(msg, true);
                if (packet === null) {
                    reject(new Error('Connect occured an unknown error'));
                    return;
                }

                if (isHandshakeAccepted(packet)) {
                    resolve(new RPCSession(
                        new RPCConnection(connection!),
                        this.rpcHandler,
                        this,
                    ));
                } else {
                    reject(new Error('Server rejected handshake request'));
                }
            }
            /** listen msg from server, and make sure handshake status */
            connection.on('msg', handleListenHandshakeReply);

            await connection.send(handshakePacket);
            if (isTimeouted) {
                return;
            }
        })

        return Promise
            .race([timeoutPromise, requestPromise])
            .finally(() => finalClear());
    }
}