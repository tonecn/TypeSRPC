import md5 from 'md5';

export const makeId = () => md5(`${Date.now()}${Math.random()}`);

export const isObject = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null;

export const isArray = (v: unknown): v is Array<unknown> => Array.isArray(v);

export const isString = (v: unknown): v is string => typeof v === 'string';

export const isFunction = (v: unknown): v is Function => typeof v === 'function';

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

const publicMethodMap = new WeakMap<Function, boolean>();
export function publicMethod(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    publicMethodMap.set(descriptor.value, true);
};
export function isPublicMethod(target: Function) {
    return publicMethodMap.get(target);
};
export function markAsPublicMethod<T extends Function | Record<any, unknown> | unknown>(obj: T, options?: {
    deep?: boolean
}): T {
    const accessed = new Set();
    function markAs(obj: Function | Record<any, unknown> | unknown) {
        if (accessed.has(obj)) {
            return;
        }

        if (isFunction(obj)) {
            publicMethodMap.set(obj, true);
        } else if (isObject(obj)) {
            accessed.add(obj);

            Object.values(obj).forEach(subObj => {
                if (isFunction(subObj)) {
                    publicMethodMap.set(subObj, true);
                }
                if (options?.deep && isObject(subObj)) {
                    markAs(subObj);
                }
            });
        }
    }

    markAs(obj);
    return obj;
}