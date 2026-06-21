export interface PageMeta {
  id: string;
  title: string;
  icon: string;
  parentId: string | null;
  position: number;
  coverColor: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SearchResult {
  id: string;
  title: string;
  icon: string;
  snippet: string;
}

export interface PageNode extends PageMeta {
  children: PageNode[];
}

export function buildTree(pages: PageMeta[]): PageNode[] {
  const map = new Map<string, PageNode>();
  const roots: PageNode[] = [];

  for (const p of pages) {
    map.set(p.id, { ...p, children: [] });
  }

  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: PageNode[]) => {
    nodes.sort((a, b) => a.position - b.position || a.createdAt - b.createdAt);
    nodes.forEach((n) => sortNodes(n.children));
  };

  sortNodes(roots);
  return roots;
}
