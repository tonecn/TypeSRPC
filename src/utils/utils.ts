import md5 from 'md5';

export const makeId = () => md5(`${Date.now()}${Math.random()}`);

export const isObject = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null;

export const isString = (v: unknown): v is string => typeof v === 'string';

export type ObjectType = Record<string, any>;

export type ToDeepPromise<T> = {
    [K in keyof T]: T[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : T[K] extends object
    ? ToDeepPromise<T[K]>
    : T[K]
};

export async function getRandomAvailablePort() {
    const { createServer } = await import('http');
    const server = createServer();

    return new Promise<number>((resolve, reject) => {
        server.on('listening', () => {
            const address = server.address();
            if (address && isObject(address)) {
                const port = address.port;
                server.close(() => {
                    resolve(port);
                })
            } else {
                server.close();
                reject(new Error('Failed to get port'));
            }
        });

        server.on('error', (err) => {
            server.close();
            reject(err);
        });

        server.listen(0);
    })
}