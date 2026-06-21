import type { PageMeta, PageNode } from "../types";

export type SelectionState = "none" | "partial" | "all";

export function collectDescendantIds(node: PageNode): string[] {
  const ids = [node.id];
  for (const child of node.children) {
    ids.push(...collectDescendantIds(child));
  }
  return ids;
}

export function collectAllPageIds(pages: PageMeta[]): string[] {
  return pages.map((p) => p.id);
}

export function getNodeSelectionState(
  node: PageNode,
  selected: Set<string>
): SelectionState {
  const ids = collectDescendantIds(node);
  const selectedCount = ids.filter((id) => selected.has(id)).length;
  if (selectedCount === 0) return "none";
  if (selectedCount === ids.length) return "all";
  return "partial";
}

export function toggleNodeSelection(
  node: PageNode,
  selected: Set<string>
): Set<string> {
  const next = new Set(selected);
  const ids = collectDescendantIds(node);
  const state = getNodeSelectionState(node, selected);
  const shouldSelect = state !== "all";

  for (const id of ids) {
    if (shouldSelect) {
      next.add(id);
    } else {
      next.delete(id);
    }
  }

  return next;
}

export function togglePageSelection(
  pageId: string,
  selected: Set<string>
): Set<string> {
  const next = new Set(selected);
  if (next.has(pageId)) {
    next.delete(pageId);
  } else {
    next.add(pageId);
  }
  return next;
}
