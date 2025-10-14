import { RPCHandler } from "@/index"

describe('Rpc accessKey test', () => {
    test('none accesskey', async () => {
        const server = new RPCHandler();
        await server.listen({
            port: 5202
        });

        const client = new RPCHandler();
        expect(client.connect({
            url: 'http://localhost:5202'
        })).resolves.toBeDefined()
    })

    test('server required', async () => {
        const serverAccesskey = 'abc123';
        const server = new RPCHandler();
        server.setAccessKey(serverAccesskey)
        await server.listen({
            port: 5203
        });

        const client = new RPCHandler();
        expect(client.connect({
            url: 'http://localhost:5203'
        })).rejects.toThrow()

        const client2 = new RPCHandler();
        expect(client2.connect({
            url: 'http://localhost:5203',
            accessKey: serverAccesskey
        })).resolves.toBeDefined()
    })
})
