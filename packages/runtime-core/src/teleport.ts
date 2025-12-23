export const TeleportImpl = {
  __isTeleport: true,
  process(n1, n2, container, anchor, operators) {
    const { mountChildren, patchChildren, move, query } = operators;
    if (n1 == null) {
      const target = query(n2.props.to) ?? document.body;
      target && mountChildren(n2.children, target);
    } else {
      patchChildren(n1, n2, n1.target, anchor);
      n2.target = n1.target;
      if (n2.props.to !== n1.props.to) {
        const target = (n2.target = query(n2.props.to) ?? document.body);
        n2.children.forEach((child) => {
          move(child, target, anchor);
        });
      }
    }
  },
};

export const isTeleport = (type) => !!type.__isTeleport;
