import { isReactive } from "./reactive";
import { ReactiveEffect } from "./effect";
import { isObj } from "@vue3/shared";

//递归去取值, 但是要注意解决循环引用的问题,使用set去解决
function traverse(source, s = new Set()) {
  if (!isObj(source)) {
    return source;
  }
  if (s.has(source)) return source;
  s.add(source);
  for (const key in source) {
    traverse(source[key], s);
  }
  return source;
}

function doWatch(source, cb, { immediate }) {
  let getter;
  if (isReactive(source)) {
    getter = () => traverse(source);
  } else {
    getter = source;
  }
  let cleanup;
  function onCleanup(callback) {
    cleanup = callback;
  }
  const job = () => {
    if (cb) {
      const newValue = effect.run();
      if (cleanup) {
        cleanup();
      }
      cb(newValue, oldValue, onCleanup);
      oldValue = newValue;
    } else {
      effect.run();
    }
  };
  const effect = new ReactiveEffect(getter, job);

  let oldValue;

  if (immediate) {
    job();
  }

  oldValue = effect.run();
}
export function watch(source, cb, options) {
  doWatch(source, cb, options);
}
export function watchEffect(source, options) {
  doWatch(source, null, Object.assign({}, { immediate: true }, options));
}
