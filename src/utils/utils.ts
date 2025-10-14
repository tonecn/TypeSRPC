import md5 from 'md5';

export const makeId = () => md5(`${Date.now()}${Math.random()}`);

export const isObject = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null;

export const isString = (v: unknown): v is string => typeof v === 'string';

export type ObjectType = Record<string, any>;

export type ToDeepPromise<T> = {
    [K in keyof T]: T[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<R>
    : T[K] extends object
    ? ToDeepPromise<T[K]>
    : T[K]
};