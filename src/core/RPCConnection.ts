import { EventEmitter } from "@/utils/EventEmitter";
import { SocketConnection } from "./SocketConnection";
import { RPCPacket } from "./RPCPacket";
import { makeCallPacket, makeCallResponsePacket, parseCallPacket, parseCallResponsePacket } from "./RPCCommon";
import { RPCProvider } from "./RPCProvider";
import { RPCError, RPCErrorCode } from "./RPCError";

interface RPCConnectionEvents {
    call: RPCPacket;
    callResponse: RPCPacket;
    handshake: RPCPacket;
    unknownMsg: unknown;
    unknownPacket: RPCPacket;
    closed: void;
}

class CallResponseEmitter extends EventEmitter<{
    [id: string]: RPCPacket;
}> {
    emitAll(packet: RPCPacket) {
        this.events.forEach(subscribers => {
            subscribers.forEach(fn => fn(packet));
        })
    }
}

export class RPCConnection extends EventEmitter<RPCConnectionEvents> {

    closed: boolean = false;

    private callResponseEmitter = new CallResponseEmitter();

    constructor(public socket: SocketConnection) {
        super();
        socket.on('closed', () => {
            this.emit('closed');
            this.callResponseEmitter.emitAll(makeCallResponsePacket({
                status: 'error',
                requestPacketId: 'connection error',
                errorCode: RPCErrorCode.CONNECTION_DISCONNECTED,
            }));
            this.callResponseEmitter.removeAllListeners();
            this.closed = true;
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

        /** route by packet.id */
        this.on('callResponse', (packet) => {
            this.callResponseEmitter.emit(packet.id, packet);
        })
    }

    /** @throws */
    public async callRequest(options: {
        fnPath: string;
        args: any[];
        timeout: number;
    }): Promise<any> {
        if (this.closed) {
            throw new RPCError({
                errorCode: RPCErrorCode.CONNECTION_DISCONNECTED,
            });
        }

        const { fnPath, args } = options;
        const packet = makeCallPacket({
            fnPath,
            args
        });

        let resolve: (data: any) => void;
        let reject: (data: any) => void;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });

        const cancelTimeoutTimer = (() => {
            const t = setTimeout(() => {
                reject(new RPCError({
                    errorCode: RPCErrorCode.TIMEOUT_ERROR,
                }))
            }, options.timeout);

            return () => clearTimeout(t);
        })();

        promise.finally(() => {
            this.callResponseEmitter.removeAllListeners(packet.id);
            cancelTimeoutTimer();
        })

        const handleCallResponsePacket = (packet: RPCPacket) => {
            const result = parseCallResponsePacket(packet);
            if (result === null) {
                return reject(new RPCError({
                    errorCode: RPCErrorCode.UNKNOWN_ERROR,
                }));;
            }

            const { success, error } = result;
            if (success) {
                return resolve(success.data);
            }

            if (error) {
                return reject(new RPCError({
                    errorCode: error.errorCode,
                    reason: error.reason
                }));
            }

            return reject(new RPCError({
                errorCode: RPCErrorCode.UNKNOWN_ERROR,
            }));;
        }
        this.callResponseEmitter.on(packet.id, handleCallResponsePacket);

        /** send call request */
        this.socket.send(packet);

        return promise;
    }

    public onCallRequest(getProvider: () => RPCProvider | undefined) {
        this.on('call', async (packet) => {
            const request = parseCallPacket(packet);
            if (request === null) {
                return this.socket.send(makeCallResponsePacket({
                    status: 'error',
                    requestPacket: packet,
                    errorCode: RPCErrorCode.CALL_PROTOCOL_ERROR,
                })).catch(() => { })
            }

            // call the function
            const provider = getProvider();
            if (!provider) {
                return this.socket.send(makeCallResponsePacket({
                    status: 'error',
                    requestPacket: packet,
                    errorCode: RPCErrorCode.PROVIDER_NOT_AVAILABLE,
                }))
            }

            const { fnPath, args } = request;
            const fn = this.getProviderFunction(provider, fnPath);
            if (!fn) {
                return this.socket.send(makeCallResponsePacket({
                    status: 'error',
                    requestPacket: packet,
                    errorCode: RPCErrorCode.METHOD_NOT_FOUND,
                }))
            }

            try {
                const result = await fn(...args);
                this.socket.send(makeCallResponsePacket({
                    status: 'success',
                    requestPacket: packet,
                    data: result,
                }))
            } catch (error) {
                this.socket.send(makeCallResponsePacket({
                    status: 'error',
                    requestPacket: packet,
                    errorCode: RPCErrorCode.SERVER_ERROR,
                    ...(error instanceof RPCError ? {
                        errorCode: error.errorCode,
                        reason: error.reason,
                    } : {})
                }))
            }
        })
    }

    private getProviderFunction(provider: RPCProvider, fnPath: string) {
        const paths = fnPath.split(':');
        let fnThis: any = provider;
        let fn: any = provider;
        try {
            while (paths.length) {
                const path = paths.shift()!;
                fn = fn[path];
                if (paths.length !== 0) {
                    fnThis = fn;
                }
            }
            if (typeof fn === 'function') {
                return fn.bind(fnThis);
            }

            throw new Error();
        } catch (error) {
            return null;
        }
    }
}