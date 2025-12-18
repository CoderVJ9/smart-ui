# issue

## vue 是如何渲染 h 函数后面传入多个字符串的

```

      import { render, h, Text, Fragment, ref } from "./runtime-dom.esm.js";

      const componentA = {
        setup(props, ctx) {
          const { emit, slots } = ctx;
          const name = ref("Vue 3");
          const handleClick = () => {
            emit("myClick");
          };
          return () => {
            return h(Fragment, [
              ...this.$slots.default(),
              ...this.$slots.header({ a: 12 }),
            ]);
          };
        },
        // render(proxy) {
        //   return h(Fragment, [
        //     h("button", { onClick: proxy.handleClick }, "点我"),
        //     h("div", proxy.name),
        //   ]);
        // },
      };
      // todo 这种的vue是怎么处理显示的
      // render(h("div", { style: { color: "red" } }, "a", "b"), app);
```
