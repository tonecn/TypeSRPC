import { EventEmitter } from "@/utils/EventEmitter";
import { RPCHandler } from "./RPCHandler";
import { createSocketServer, SocketServer } from "./SocketServer";
import { RPCSession } from "./RPCSession";
import { RPCPacket } from "./RPCPacket";
import { makeCallResponsePacket, makeHandshakePacket, verifyHandshakeRequest } from "./RPCCommon";
import { RPCErrorCode } from "./RPCError";
import { RPCConnection } from "./RPCConnection";

interface RPCServerEvents {
    connect: RPCSession;
}

const DefaultRPCServerConfig = {
    handshakeTimeout: 30 * 1000,
}

export class RPCServer extends EventEmitter<RPCServerEvents> {

    private socketServer?: SocketServer;

    constructor(private rpcHandler: RPCHandler) {
        super();
    }

    public async listen(options: {
        port: number;
    }) {
        // call the listen method of socket server
        if (!this.socketServer) {
            this.socketServer = createSocketServer();
        }

        const socketServer = this.socketServer;
        this.registerSocketServerListener(socketServer);

        return socketServer.listen(options);
    }

    private registerSocketServerListener(socketServer: SocketServer) {
        socketServer.on('connect', (socketConnection) => {
            let cancelTimeoutTimer = (() => {
                let t = setTimeout(() => {
                    socketConnection.send(makeHandshakePacket({
                        state: 1,
                        accept: false,
                        reason: 'Timeout',
                    })).catch(() => { });
                    socketConnection.close();
                }, DefaultRPCServerConfig.handshakeTimeout);
                return () => clearTimeout(t);
            })();

            const handleHandshakeRequest = (msg: unknown) => {
                // before handshake successfully, it should reject any packet expect handshake
                const packet = RPCPacket.Parse(msg, true);
                if (!packet) {
                    return;
                }

                if (RPCPacket.isCallPacket(packet) || RPCPacket.isCallResponsePacket(packet)) {
                    socketConnection.send(makeCallResponsePacket({
                        requestPacket: packet,
                        status: 'error',
                        errorCode: RPCErrorCode.HANDSHAKE_INCOMPLETE,
                    })).catch(() => { });
                    return;
                }

                const acceptHandshake = verifyHandshakeRequest({
                    packet,
                    /** @todo */
                    thatAccessKeys: undefined,
                    thisAccessKey: this.rpcHandler.getAccessKey(),
                });

                if (acceptHandshake) {
                    this.emit('connect', new RPCSession(
                        new RPCConnection(socketConnection),
                        this.rpcHandler,
                        this,
                    ));
                }

                socketConnection.send(makeHandshakePacket({
                    state: 1,
                    accept: acceptHandshake,
                }));
                cancelTimeoutTimer();
                removeListener();
            }
            socketConnection.on('msg', handleHandshakeRequest);

            let removeListener = () => {
                socketConnection.off('msg', handleHandshakeRequest);
                removeListener = () => { };
            }

            socketConnection.on('closed', removeListener);
        });
    }
}