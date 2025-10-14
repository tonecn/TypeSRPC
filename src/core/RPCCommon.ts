import { isObject } from "@/utils/utils";
import { RPC_ERROR_MESSAGES, RPCErrorCode } from "./RPCError";
import { RPCPacket } from "./RPCPacket";

function makeHandshakePacket(data: {
    state: 0;
    thisAccessKey: string | null;
    accessKey: string | null;
}): RPCPacket;
function makeHandshakePacket(data: {
    state: 1;
    accept: boolean;
    reason?: string;
}): RPCPacket;
function makeHandshakePacket(data: {
    state: 0 | 1,
    thisAccessKey?: string | null;
    accessKey?: string | null;
    accept?: boolean;
    reason?: string;
}): RPCPacket {
    return new RPCPacket({
        type: 'handshake',
        data,
    });
}

export {
    makeHandshakePacket,
};

export function verifyHandshakeRequest(options: {
    /** handshake request packet */
    packet: RPCPacket;
    /** If empty, all connections are allowed */
    thisAccessKey?: string;
    /** If empty, all connections are allowed */
    thatAccessKeys?: string[];
}) {
    const { data } = options.packet;
    if (!isObject(data)) {
        return false;
    }

    if ('state' in data && 'thisAccessKey' in data && 'accessKey' in data) {
        const { state, thisAccessKey: thatAccessKey, accessKey } = data;
        if (state !== 0) {
            return false;
        }

        if (options.thisAccessKey && options.thisAccessKey !== accessKey) {
            return false;
        }

        if (options.thatAccessKeys && !options.thatAccessKeys.includes(thatAccessKey)) {
            return false;
        }

        return true;
    }

    return false;
}

export function isHandshakeAccepted(packet: RPCPacket) {
    const { data } = packet;
    if (!isObject(data)) {
        return false;
    }

    if ('state' in data && data.state === 1) {
        if ('accept' in data && typeof data.accept === 'boolean') {
            return data.accept;
        }
    }

    return false;
}


function isValidMethodPathExtended(str: unknown): str is string {
    if (typeof str !== 'string' || str.length === 0) {
        return false;
    }

    const regex = /^[a-zA-Z0-9_$]+(?::[a-zA-Z0-9_$]+)*$/;
    return regex.test(str);
}


export function makeCallPacket(options: {
    fnPath: string;
    args: any[];
    // timeout: number;
}) {
    const data = {
        ...options,
    }

    return new RPCPacket({
        type: 'call',
        data,
    })
}

export function parseCallPacket(packet: RPCPacket) {
    if (!RPCPacket.isCallPacket(packet)) {
        return null;
    }

    if (!isObject(packet.data)) {
        return null;
    }

    const { data } = packet;
    if ('fnPath' in data && 'args' in data) {
        const { fnPath, args } = data;
        if (!isValidMethodPathExtended(fnPath)) {
            console.log('66', fnPath)
            return null;
        }

        if (!Array.isArray(args)) {
            return null;
        }

        return {
            fnPath,
            args,
        }
    }
    return null;
}

type BaseCallResponseOptions = (
    | { requestPacket: RPCPacket; requestPacketId?: never }
    | { requestPacket?: never; requestPacketId: string }
);

type SuccessResponseOptions = BaseCallResponseOptions & {
    status: 'success';
    data: any;
    requestPacket?: RPCPacket;
    requestPacketId?: string;
};

type ErrorResponseOptions = BaseCallResponseOptions & {
    status: 'error';
    errorCode?: number;
    reason?: string;
    data?: never;
    requestPacket?: RPCPacket;
    requestPacketId?: string;
};

export function makeCallResponsePacket(options: SuccessResponseOptions | ErrorResponseOptions): RPCPacket {
    let { requestPacket, requestPacketId, ...o } = options;
    requestPacketId = requestPacketId ?? requestPacket?.id;
    if (!requestPacketId) {
        throw new Error('Request Packet Id is required');
    }

    const data = {
        ...o,
    }
    if (data.status === 'error') {
        if (!data.errorCode) {
            const errorCode = RPCErrorCode.GENERAL_ERROR;
            data.errorCode = errorCode;
            data.reason = RPC_ERROR_MESSAGES[errorCode];
        }

        if (data.errorCode && !data.reason) {
            data.reason = RPC_ERROR_MESSAGES[data.errorCode]
                ?? RPC_ERROR_MESSAGES[RPCErrorCode.GENERAL_ERROR];
        }
    }

    return new RPCPacket({
        id: requestPacketId,
        type: 'response',
        data,
    })
}


export function parseCallResponsePacket(packet: RPCPacket) {
    if (!RPCPacket.isCallResponsePacket(packet)) {
        return null;
    }

    if (!isObject(packet.data)) {
        return null;
    }

    const { data } = packet;
    if (!('status' in data)) {
        return null;
    }

    const { status } = data;
    if (typeof status !== 'string') {
        return null;
    }

    if (status === 'success') {
        return {
            success: {
                data: data.data,
            },
            error: null,
        }
    } else if (status === 'error') {
        if ('errorCode' in data && 'reason' in data) {
            const { errorCode, reason } = data;
            if (typeof errorCode !== 'number' || typeof reason !== 'string') {
                return null;
            }
            return {
                success: null,
                error: {
                    errorCode,
                    reason,
                }
            }
        }
    }
    return null;
}
