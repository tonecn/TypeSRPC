import { isObject, isString, makeId } from "@/utils/utils"

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