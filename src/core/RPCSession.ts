import { ToDeepPromise } from "@/utils/utils";
import { RPCConnection } from "./RPCConnection";
import { RPCHandler } from "./RPCHandler";
import { RPCProvider } from "./RPCProvider";
import { RPCClient } from "./RPCClient";
import { RPCServer } from "./RPCServer";


export class RPCSession {

    constructor(
        public readonly connection: RPCConnection,
        public readonly rpcHandler: RPCHandler,
        public readonly provider: RPCClient | RPCServer,
    ) {
        connection.setRPCSession(this);
        connection.onCallRequest(rpcHandler.getProvider.bind(rpcHandler));
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
                    return this.connection.callRequest({
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
}