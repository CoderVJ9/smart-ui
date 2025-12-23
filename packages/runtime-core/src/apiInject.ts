import { currentInstance } from "./component";

export function provide(key, value) {
  if (!currentInstance) return;

  let provides = currentInstance.provides;
  const parentProvides = currentInstance.parent?.provides;
  if (provides === parentProvides) {
    provides = currentInstance.provides = Object.create(parentProvides);
  }
  provides[key] = value;
}

export function inject(key, defaultValue) {
  if (!currentInstance) return;

  const provides = currentInstance.parent?.provides;
  if (provides && key in provides) {
    return provides[key];
  } else if (defaultValue != undefined) {
    return defaultValue;
  }
}
