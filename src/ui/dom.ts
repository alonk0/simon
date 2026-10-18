type Attrs = Record<string, string | boolean>;
type Child = Node | string;

// Small DOM builder. Text is always set via text nodes (never innerHTML).
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === false) continue;
    node.setAttribute(name, value === true ? '' : value);
  }
  node.append(...children);
  return node;
}
