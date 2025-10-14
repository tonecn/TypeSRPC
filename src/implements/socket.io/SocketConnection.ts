import { SocketConnection as SocketConnectionBase, SocketConnectionBaseEvents } from "@/core/SocketConnection";
import { EventEmitter } from "@/utils/EventEmitter";

interface SocketConnectionEvents extends SocketConnectionBaseEvents {

};

export class SocketConnection
    extends EventEmitter<SocketConnectionBaseEvents> implements SocketConnectionBase {

    constructor(private args: {
        sendMethod: (data: any) => void;
        closeMethod: () => void;
    }) {
        super();
    }

    public async send(data: any): Promise<void> {
        this.args.sendMethod(data);
    }

    public async close(): Promise<void> {
        this.args.closeMethod();
    }
}