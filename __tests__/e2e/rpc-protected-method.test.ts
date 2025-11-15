import { isPublicMethod, markAsPublicMethod, publicMethod, RPCErrorCode, RPCHandler } from "@/index"

describe('Rpc protected method test', () => {
    test('disabled protection', async () => {
        class Methods {
            @publicMethod
            allow() {
                return 0;
            }
            disabled() { }
        }

        const classMethods = new Methods();
        const provider = {
            classMethods,
            normal: markAsPublicMethod(() => 0),
            normal2: markAsPublicMethod(function () { return 0 }),
            normalProtected: function () { },
            shallowObj: markAsPublicMethod({
                fn1: () => 0,
                l1: {
                    fn1: () => 0,
                }
            }),
            deepObj: markAsPublicMethod({
                fn1: () => 0,
                l1: {
                    fn1: () => 0,
                }
            }, { deep: true }),
        }

        const server = new RPCHandler({
            enableMethodProtection: true,
        });
        server.setProvider(provider);
        await server.listen({
            port: 5210
        });


        const client = new RPCHandler();
        const session = await client.connect({
            url: 'http://localhost:5210'
        });
        const api = session.getAPI<typeof provider>();
        await expect(api.classMethods.allow()).resolves.toBe(0);
        await expect(api.classMethods.disabled()).rejects
            .toHaveProperty('errorCode', RPCErrorCode.METHOD_PROTECTED);
        await expect(api.normal()).resolves.toBe(0);
        await expect(api.normal2()).resolves.toBe(0);
        await expect(api.normalProtected()).rejects
            .toHaveProperty('errorCode', RPCErrorCode.METHOD_PROTECTED);

        await expect(api.shallowObj.fn1()).resolves.toBe(0);
        await expect(api.shallowObj.l1.fn1()).rejects
            .toHaveProperty('errorCode', RPCErrorCode.METHOD_PROTECTED);

        await expect(api.deepObj.fn1()).resolves.toBe(0);
        await expect(api.deepObj.l1.fn1()).resolves.toBe(0);
    })

})
