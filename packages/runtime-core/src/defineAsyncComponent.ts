import { ref } from "@vue3/reactivity";
import { isFunction } from "@vue3/shared";
import { h } from "./h";

export function defineAsyncComponent(options) {
  if (isFunction(options)) {
    options = { loader: options };
  }
  let Component;
  let delayTimer = null;
  let timeoutTimer = null;
  return {
    setup() {
      const { loader } = options;
      const loaded = ref(false);
      const loading = ref(false);
      const error = ref(false);
      const attempts = ref(0);
      function load() {
        return loader().catch((err) => {
          attempts.value++;
          return new Promise((resolve, reject) => {
            if (options.onError) {
              const retry = () => resolve(load());
              const fail = () => reject(err);
              options.onError(err, retry, fail, attempts.value);
            } else {
              reject(err);
            }
          });
        });
      }

      load()
        .then((res) => {
          Component = res;
          loaded.value = true;
        })
        .catch(() => {
          error.value = true;
        })
        .finally(() => {
          loading.value = false;
          clearTimeout(delayTimer);
        });

      if (options.delay) {
        delayTimer = setTimeout(() => {
          loading.value = true;
        }, options.delay);
      }
      if (options.timeout) {
        timeoutTimer = setTimeout(() => {
          error.value = true;
        }, options.timeout);
      }

      return () => {
        if (loaded.value) {
          return h(Component);
        } else if (error.value && options.errorComponent) {
          return h(options.errorComponent);
        } else if (loading.value && options.loadingComponent) {
          return h(options.loadingComponent);
        }

        return h("div", "默认空");
      };
    },
  };
}
