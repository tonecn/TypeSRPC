import { getRandomAvailablePort, isObject, isPublicMethod, isString, makeId, markAsPublicMethod } from "@/utils/utils"

test('makeId', () => {
    const id = makeId();
    expect(id.length).toBe(32);
    expect(typeof id === 'string').toBeTruthy();
})

test('isObject', () => {
    const nullObj = null;
    expect(isObject(nullObj)).toBeFalsy();
    const normalObj = {};
    expect(isObject(normalObj)).toBeTruthy();
})

test('isString', () => {
    const emptyStr = '';
    expect(isString(emptyStr)).toBeTruthy();
    const str = 'str';
    expect(isString(str)).toBeTruthy();
    const aNumber = 1;
    expect(isString(aNumber)).toBeFalsy();
})

test('getRandomAvailablePort', async () => {
    const port = await getRandomAvailablePort();
    expect(port).toBeGreaterThanOrEqual(1);
    expect(port).toBeLessThanOrEqual(65535);
})

test('markAsPublick', () => {
    const shallowObj = {
        fn1() { },
        l1: {
            fn1() { },
        }
    };

    const deepObj = {
        fn1() { },
        l1: {
            fn1() { },
        }
    };

    markAsPublicMethod(shallowObj);
    markAsPublicMethod(deepObj, { deep: true });

    expect(isPublicMethod(shallowObj.fn1)).toBeTruthy();
    expect(isPublicMethod(shallowObj.l1.fn1)).toBeUndefined();

    expect(isPublicMethod(deepObj.fn1)).toBeTruthy();
    expect(isPublicMethod(deepObj.l1.fn1)).toBeTruthy();
})