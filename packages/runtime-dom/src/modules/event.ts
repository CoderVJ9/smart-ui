function createFnInvoker(fn) {
  const invoker = () => invoker.value();
  invoker.value = fn;
  return invoker;
}

export function patchEvent(el, key, nextValue) {
  const invokers = el._vei || (el._vei = {});
  const name = key.slice(2).toLowerCase();

  const existingInvoker = invokers[name];
  //有旧的事件, 也传入了新的事件 那么就更新事件
  if (existingInvoker && nextValue) {
    existingInvoker.value = nextValue;
  } else {
    // 如果 nextValue 存在，则添加事件监听器
    if (nextValue) {
      const fn = (invokers[name] = createFnInvoker(nextValue));
      el.addEventListener(name, fn);
    } else if (existingInvoker) {
      el.removeEventListener(name, existingInvoker);
      invokers[name] = null;
    }
  }
}
