## issue

### vue 是如何渲染 h 函数后面传入多个字符串的

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

## 组件

### AsyncComponet 异步组件

### Teleport 组件

## API

### provide / inject

- 在 vue2 中, 子元素要获取 inject,是递归找 parent, 一层一层的找, 直到找到为止
- 在 vue3 中, 改为了每一个子元素都继承父元素 provide 的数据, 如果自己也 provide 了数据,那么 parent 的 provid 放到自己的原型上,
  这样 inject 的时候,只需要找自己的 parent 即可,无需递归查找
