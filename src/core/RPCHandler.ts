import { EventEmitter } from "@/utils/EventEmitter";
import { RPCClient } from "./RPCClient";
import { RPCServer } from "./RPCServer";
import { RPCProvider } from "./RPCProvider";
import { RPCSession } from "./RPCSession";

const DefaultListenOptions = {
    port: 5201,
    path: '/'
} as const;

const DefaultConnectOptions = {
    url: new URL(DefaultListenOptions.path, `http://localhost:${DefaultListenOptions.port}`).href,
    /** default is 30 * 1000 in server side */
    timeout: 10 * 3000,
} as const;

interface RPCHandlerEvents {
    connect: RPCSession;
}

interface RPCConfig {
    enableMethodProtection: boolean;
}

let DefaultRPCConfig: RPCConfig = {
    enableMethodProtection: false,
}

export class RPCHandler extends EventEmitter<RPCHandlerEvents> {

    private rpcClient?: RPCClient;
    private rpcServer?: RPCServer;
    private provider?: RPCProvider;
    private accessKey?: string;
    private config: RPCConfig;

    constructor(
        args?: {
            rpcClient?: RPCClient;
            rpcServer?: RPCServer;
        } & Partial<RPCConfig>
    ) {
        super();
        const { rpcClient, rpcServer, ...config } = args ?? {};

        if (rpcClient) {
            this.setRPCProvider(rpcClient);
        }

        if (rpcServer) {
            this.setRPCProvider(rpcServer);
        }

        this.config = {
            ...DefaultRPCConfig,
            ...config,
        }
    }

    getConfig() {
        return this.config;
    }

    setProvider<T extends RPCProvider>(provider: T) {
        this.provider = provider;
    }

    getProvider() {
        return this.provider;
    }

    setAccessKey(accessKey: string | undefined) {
        this.accessKey = accessKey;
    }

    getAccessKey() {
        return this.accessKey;
    }

    setRPCProvider(provider?: RPCClient | RPCServer) {
        if (provider instanceof RPCServer) {
            this.rpcServer = provider;
        } else if (provider instanceof RPCClient) {
            this.rpcClient = provider;
        } else {
            throw new Error();
        }
    }

    async connect(options: {
        url?: string;
        accessKey?: string;
        timeout?: number;
    } = {}) {
        const rpcClient = this.getRPCProvider('client', true);

        return rpcClient.connect({
            ...DefaultConnectOptions,
            ...options,
        });
    }

    async listen(options: {
        port?: number;
    } = {}) {
        const rpcServer = this.getRPCProvider('server', true);

        return rpcServer.listen({
            ...DefaultListenOptions,
            ...options,
        }).finally(() => {
            rpcServer.on('connect', rpcSession => {
                this.emit('connect', rpcSession);
            })
        });
    }

    public getRPCProvider(type: 'client', init: true): RPCClient;
    public getRPCProvider(type: 'client', init?: boolean): RPCClient | undefined;
    public getRPCProvider(type: 'server', init: true): RPCServer;
    public getRPCProvider(type: 'server', init?: boolean): RPCServer | undefined;
    public getRPCProvider(type: 'client' | 'server', init?: boolean) {
        if (type === 'client') {
            if (!this.rpcClient && init) {
                this.rpcClient = new RPCClient(this);
            }
            return this.rpcClient;
        } else if (type === 'server') {
            if (!this.rpcServer && init) {
                this.rpcServer = new RPCServer(this);
            }
            return this.rpcServer;
        } else {
            throw new Error();
        }
    }
}