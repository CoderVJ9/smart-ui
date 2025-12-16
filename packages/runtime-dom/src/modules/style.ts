export function patchStyle(el, prevValue, nextValue) {
  const style = el.style;

  for (const key in nextValue) {
    style[key] = nextValue[key];
  }

  //老的有  新的没有 要移除
  for (const key in prevValue) {
    if (nextValue[key] == null) {
      style[key] = null;
    }
  }
}
