import { reactive } from "@vue3/reactivity";
import { hasOwn } from "@vue3/shared";

export function initProps(instance, rawProps) {
  const props = {};
  const attrs = {};

  if (rawProps) {
    for (const key in rawProps) {
      if (hasOwn(instance.propsOptions, key)) {
        props[key] = rawProps[key];
      } else {
        attrs[key] = rawProps[key];
      }
    }
  }

  instance.props = reactive(props);
  instance.attrs = attrs;
}
