export enum RPCErrorCode {
    GENERAL_ERROR = -1,
    UNKNOWN_ERROR = -2,
    SERVER_ERROR = -200,
    METHOD_NOT_FOUND = -201,
    METHOD_PROTECTED = -202,
    PROVIDER_NOT_AVAILABLE = -203,
    AUTH_REJECTED = -300,
    HANDSHAKE_INCOMPLETE = -400,
    TIMEOUT_ERROR = -500,
    CALL_PROTOCOL_ERROR = -600,
}

export const RPC_ERROR_MESSAGES: Record<RPCErrorCode | number, string> = {
    [RPCErrorCode.GENERAL_ERROR]: 'General error',
    [RPCErrorCode.UNKNOWN_ERROR]: 'Unknown error',
    [RPCErrorCode.SERVER_ERROR]: 'Server error',
    [RPCErrorCode.METHOD_NOT_FOUND]: 'Method not found',
    [RPCErrorCode.METHOD_PROTECTED]: 'Method is protected',
    [RPCErrorCode.PROVIDER_NOT_AVAILABLE]: 'Provider not available',
    [RPCErrorCode.AUTH_REJECTED]: 'Authentication rejected',
    [RPCErrorCode.HANDSHAKE_INCOMPLETE]: 'Handshake not completed',
    [RPCErrorCode.TIMEOUT_ERROR]: 'Request timeout',
    [RPCErrorCode.CALL_PROTOCOL_ERROR]: 'Call protocol error',
} as const;

export class RPCError extends Error {

    public errorCode: number;
    public reason: string;

    constructor(
        args: {
            errorCode?: number;
            reason?: string;
        } = {}
    ) {
        let { errorCode, reason } = args;
        errorCode = errorCode ?? RPCErrorCode.GENERAL_ERROR;
        reason = reason
            ?? RPC_ERROR_MESSAGES[errorCode]
            ?? RPC_ERROR_MESSAGES[RPCErrorCode.UNKNOWN_ERROR];

        super(`[${errorCode}] ${reason}`);
        this.errorCode = errorCode;
        this.reason = reason;
    }
}