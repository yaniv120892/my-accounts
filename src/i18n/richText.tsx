import { Fragment, type ReactNode } from 'react';

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Fills `{name}` placeholders with elements, for messages that wrap part of the
 * sentence in markup (a link, a bold name, an LTR email address). Translate
 * without variables to get the template: `richText({ template: t("join.invited"), nodes: { inviter: <b>…</b> } })`.
 */
export function richText({
  template,
  nodes,
}: {
  template: string;
  nodes: Record<string, ReactNode>;
}): ReactNode {
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of template.matchAll(PLACEHOLDER)) {
    const [placeholder, name] = match;
    const index = match.index ?? 0;
    parts.push(template.slice(cursor, index));
    parts.push(name !== undefined && name in nodes ? nodes[name] : placeholder);
    cursor = index + placeholder.length;
  }
  parts.push(template.slice(cursor));
  return parts.map((part, index) => <Fragment key={index}>{part}</Fragment>);
}
