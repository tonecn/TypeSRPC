import { EventEmitter } from "@/utils/EventEmitter";
import { SocketConnection } from "./SocketConnection";
import { RPCPacket } from "./RPCPacket";

interface RPCConnectionEvents {
    call: RPCPacket;
    callResponse: RPCPacket;
    handshake: RPCPacket;
    unknownMsg: unknown;
    unknownPacket: RPCPacket;
    closed: void;
}

export class RPCConnection extends EventEmitter<RPCConnectionEvents> {

    closed: boolean = false;

    constructor(public socket: SocketConnection) {
        super();
        socket.on('closed', () => {
            this.closed = true;
            this.emit('closed');
        });

        socket.on('msg', (msg) => {
            const packet = RPCPacket.Parse(msg, true);
            if (packet === null) {
                this.emit('unknownMsg', msg);
                return;
            }

            if (RPCPacket.isCallPacket(packet)) {
                this.emit('call', packet);
                return;
            }

            if (RPCPacket.isCallResponsePacket(packet)) {
                this.emit('callResponse', packet);
                return;
            }

            /** In fact, it will never be triggered */
            if (RPCPacket.isHandshakePacket(packet)) {
                this.emit('handshake', packet);
                return;
            }

            this.emit('unknownPacket', packet);
        });
    }

    public async close() {
        return this.socket.close();
    }

    public async send(data: RPCPacket) {
        if (this.closed) {
            return;
        }

        return this.socket.send(data);
    }
}