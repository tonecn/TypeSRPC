import { RPCError, RPCErrorCode } from "@/core/RPCError";
import { RPCHandler } from "@/index"
import { getRandomAvailablePort } from "@/utils/utils";

type serverProvider = { test: () => Promise<string> };

describe('Rpc disconnected test', () => {
    test('main', async () => {
        const port = await getRandomAvailablePort();

        const server = new RPCHandler();
        server.setProvider<serverProvider>({
            test() {
                return new Promise<string>((resolve) => setTimeout(() => resolve('ok'), 1000))
            },
        })
        await server.listen({
            port,
        });

        const client = new RPCHandler();
        const session = await client.connect({
            url: `http://localhost:${port}`,
        });
        const api = session.getAPI<serverProvider>();

        const callPromise = api.test()

        await session.connection.close();
        await expect(api.test()).rejects.toMatchObject(
            expect.objectContaining({
                constructor: RPCError,
                errorCode: RPCErrorCode.CONNECTION_DISCONNECTED
            })
        );
        await expect(callPromise).rejects.toBeInstanceOf(RPCError);
        await expect(callPromise).rejects
            .toHaveProperty('errorCode', RPCErrorCode.CONNECTION_DISCONNECTED);
    })
})
