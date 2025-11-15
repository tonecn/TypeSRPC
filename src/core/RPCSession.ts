import { isPublicMethod, ToDeepPromise } from "@/utils/utils";
import { RPCConnection } from "./RPCConnection";
import { RPCHandler } from "./RPCHandler";
import { RPCProvider } from "./RPCProvider";
import { RPCClient } from "./RPCClient";
import { RPCServer } from "./RPCServer";
import { RPCError, RPCErrorCode } from "./RPCError";
import { makeCallPacket, makeCallResponsePacket, parseCallPacket, parseCallResponsePacket } from "./RPCCommon";
import { RPCPacket } from "./RPCPacket";
import { EventEmitter } from "@/utils/EventEmitter";

function getProviderFunction(provider: RPCProvider, fnPath: string):
    [(...args: any[]) => Promise<any>, object] | null {
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
            return [fn, fnThis];
        }

        throw new Error();
    } catch (error) {
        return null;
    }
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

export class RPCSession {

    public callResponseEmitter = new CallResponseEmitter();

    constructor(
        public readonly connection: RPCConnection,
        public readonly rpcHandler: RPCHandler,
        public readonly rpcProvider: RPCClient | RPCServer,
    ) {
        /** route by packet.id */
        this.connection.on('callResponse', (packet) => {
            this.callResponseEmitter.emit(packet.id, packet);
        });

        this.connection.on('closed', () => {
            this.callResponseEmitter.emitAll(makeCallResponsePacket({
                status: 'error',
                requestPacketId: 'connection error',
                errorCode: RPCErrorCode.CONNECTION_DISCONNECTED,
            }));
            this.callResponseEmitter.removeAllListeners();
        });

        this.connection.on('call', (packet) => {
            this.onCallRequest(packet).then(res => {
                this.connection.send(res);
            }).catch((e) => {
                console.warn(`${e}`);
            })
        });
    }

    getAPI<T extends RPCProvider>(): ToDeepPromise<T> {
        const createProxy = (path: string[] = []) => {
            const func = function () { };

            const handler: ProxyHandler<any> = {
                get(target, prop) {
                    const newPath = [...path, prop.toString()];
                    return createProxy(newPath);
                },
                apply: (target, thisArg, args) => {
                    return this.callRequest({
                        fnPath: path.join(':'),
                        args: args,
                        /** @todo accept from caller */
                        timeout: 10 * 1000,
                    })
                }
            };

            return new Proxy(func, handler);
        }

        return createProxy() as unknown as ToDeepPromise<T>;
    }

    /** @throws */
    public async callRequest(options: {
        fnPath: string;
        args: any[];
        timeout: number;
    }): Promise<any> {
        if (this.connection.closed) {
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
        this.callResponseEmitter.once(packet.id, handleCallResponsePacket);

        /** send call request */
        this.connection.send(packet);

        return promise.finally(() => {
            this.callResponseEmitter.removeAllListeners(packet.id);
            cancelTimeoutTimer();
        });
    }

    private async onCallRequest(packet: RPCPacket): Promise<RPCPacket> {
        const request = parseCallPacket(packet);
        if (request === null) {
            return makeCallResponsePacket({
                status: 'error',
                requestPacket: packet,
                errorCode: RPCErrorCode.CALL_PROTOCOL_ERROR,
            });
        }

        // call the function
        const provider = this.rpcHandler.getProvider();
        if (!provider) {
            return makeCallResponsePacket({
                status: 'error',
                requestPacket: packet,
                errorCode: RPCErrorCode.PROVIDER_NOT_AVAILABLE,
            });
        }

        const { fnPath, args } = request;
        const fnRes = getProviderFunction(provider, fnPath);
        if (!fnRes) {
            return makeCallResponsePacket({
                status: 'error',
                requestPacket: packet,
                errorCode: RPCErrorCode.METHOD_NOT_FOUND,
            })
        }
        const [fn, fnThis] = fnRes;

        const { enableMethodProtection } = this.rpcHandler.getConfig();
        if (enableMethodProtection) {
            if (!isPublicMethod(fn)) {
                return makeCallResponsePacket({
                    status: 'error',
                    requestPacket: packet,
                    errorCode: RPCErrorCode.METHOD_PROTECTED,
                })
            }
        }

        try {
            const result = await fn.bind(fnThis)(...args);
            return makeCallResponsePacket({
                status: 'success',
                requestPacket: packet,
                data: result,
            })
        } catch (error) {
            return makeCallResponsePacket({
                status: 'error',
                requestPacket: packet,
                errorCode: RPCErrorCode.SERVER_ERROR,
                ...(error instanceof RPCError ? {
                    errorCode: error.errorCode,
                    reason: error.reason,
                } : {})
            })
        }
    }
}