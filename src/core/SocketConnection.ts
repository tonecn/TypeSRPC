import { EventEmitter } from "@/utils/EventEmitter";

export interface SocketConnectionBaseEvents {
    msg: any;
    /** reason */
    closed: string | undefined;
}

export abstract class SocketConnection extends EventEmitter<SocketConnectionBaseEvents> {
    public abstract send(data: any): Promise<void>;
    public abstract close(): Promise<void>;
}