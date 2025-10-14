import { isObject, isString, makeId, ObjectType } from "@/utils/utils";

export type RPCPacketType = 'handshake' | 'call' | 'response';

export class RPCPacket {

    id: string;
    type: RPCPacketType;
    data: ObjectType;

    constructor(
        args: {
            id?: string,
            type: RPCPacketType,
            data: ObjectType;
        }
    ) {
        this.id = args.id ?? makeId();
        this.type = args.type;
        this.data = args.data;
    }

    static Parse(value: unknown, safe: true): RPCPacket | null;
    static Parse(value: unknown, safe?: boolean): RPCPacket;
    static Parse(value: unknown, safe: boolean = false) {
        try {
            if (isObject(value) && this.isRPCPacket(value)) {
                return this.ObjToRPCPacket(value);
            } else if (isString(value)) {
                const obj = JSON.parse(value);
                return this.ObjToRPCPacket(obj);
            }

            throw new Error(`${value} is not a RPCPacket`);
        } catch (error) {
            if (safe) {
                return null;
            }

            throw error;
        }
    }

    private static ObjToRPCPacket(obj: RPCPacket) {
        const { id, type, data } = obj;
        return new RPCPacket({
            id, type, data,
        })
    }

    static isRPCPacket(value: unknown): value is RPCPacket {
        if (!isObject(value)) {
            return false;
        }

        if (!('id' in value) || !('type' in value) || !('data' in value)) {
            return false;
        }

        return (this.isRPCPacketID(value.id)
            && this.isRPCPacketType(value.type)
            && this.isRPCPacketData(value.data))
    }

    static isRPCPacketID(value: unknown) {
        if (typeof value !== 'string' || value.trim().length === 0) {
            return false;
        }

        return true;
    }

    static isRPCPacketType(type: unknown) {
        if (typeof type !== 'string') {
            return false;
        }

        if (!['handshake', 'call', 'response'].includes(type)) {
            return false;
        }

        return true;
    }

    static isRPCPacketData(data: unknown) {
        return isObject(data);
    }

    static isHandshakePacket(packet: RPCPacket) {
        return packet.type === 'handshake';
    }

    static isCallPacket(packet: RPCPacket) {
        return packet.type === 'call';
    }

    static isCallResponsePacket(packet: RPCPacket) {
        return packet.type === 'response';
    }
}