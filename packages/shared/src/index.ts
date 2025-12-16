export * from "./shapeFlags";
export function isObj(value: any) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

export function isFunction(value) {
  return typeof value === "function";
}

export function isString(value) {
  return typeof value === "string";
}

const hasOwnProperty = Object.prototype.hasOwnProperty;
export function hasOwn(obj, key) {
  return hasOwnProperty.call(obj, key);
}
