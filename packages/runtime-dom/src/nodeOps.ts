export const nodeOps = {
  createElement(type) {
    return document.createElement(type);
  },
  setElementText(node, text) {
    node.textContent = text;
  },
  insert(child, parent, anchor) {
    parent.insertBefore(child, anchor || null);
  },
  remove(child) {
    child.parentNode.removeChild(child);
  },
  createText(text) {
    return document.createTextNode(text);
  },
  setText(node, text) {
    node.nodeValue = text;
  },
  parentNode(node) {
    return node.parentNode;
  },
  querySelector(selector) {
    return document.querySelector(selector);
  },
  nextSibling(node) {
    return node.nextSibling;
  },
  setAttribute(el, key, value) {
    el.setAttribute(key, value);
  },
  getAttribute(el, key) {
    return el.getAttribute(key);
  },
};
