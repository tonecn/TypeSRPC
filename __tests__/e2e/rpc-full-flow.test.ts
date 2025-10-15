import { RPCHandler } from "@/index"
import { ToDeepPromise } from "@/utils/utils";

type ServerProvider = {
    add: (a: number, b: number) => number;
    math: {
        multiply: (a: number, b: number) => number;
        utils: {
            absolute: (num: number) => number;
        };
    }
}

const serverProvider = {
    add(a: number, b: number) {
        return a + b;
    },
    math: {
        multiply(a: number, b: number) {
            return a * b
        },
        utils: {
            absolute(num: number) {
                return Math.abs(num);
            },
        }
    }
}


type ClientProvider = {
    getName: () => string;
    sub: {
        getName: () => string;
    }
}

const clientProvider = {
    name: '1',
    getName() {
        return this.name;
    },
    sub: {
        name: '2',
        getName() {
            return this.name;
        }
    }
}

let clientAPI: ToDeepPromise<ClientProvider>
let serverAPI: ToDeepPromise<ServerProvider>
describe('Rpc full flow test', () => {
    beforeAll(async () => {
        const server = new RPCHandler();
        server.setProvider(serverProvider)
        await server.listen();

        server.on('connect', (rpcSession) => {
            clientAPI = rpcSession.getAPI<ClientProvider>();
        })

        const client = new RPCHandler();
        client.setProvider(clientProvider);
        await client.connect().then((rpcSession) => {
            serverAPI = rpcSession.getAPI<ServerProvider>();
        });
    })

    test('server', async () => {
        const addResult = await serverAPI.add(1, 1);
        expect(addResult).toBe(2);
        const multiplyResult = await serverAPI.math.multiply(2, 3);
        expect(multiplyResult).toBe(6);
        const absoluteResult = await serverAPI.math.utils.absolute(-1);
        expect(absoluteResult).toBe(1);
    })

    test('client', async () => {
        const name1 = await clientAPI.getName();
        expect(name1).toBe(clientProvider.name);
        const name2 = await clientAPI.sub.getName();
        expect(name2).toBe(clientProvider.sub.name);
    })
})