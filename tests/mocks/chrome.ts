type BookmarkNode = {
  id: string;
  parentId?: string;
  title: string;
  url?: string;
  children?: BookmarkNode[];
};

type BookmarkTree = {
  root: BookmarkNode;
  nodes: Map<string, BookmarkNode>;
};

const createTree = (): BookmarkTree => {
  const root: BookmarkNode = { id: "0", title: "root", children: [] };
  const nodes = new Map<string, BookmarkNode>();
  nodes.set(root.id, root);
  return { root, nodes };
};

export function createChromeBookmarkMock() {
  const tree = createTree();

  const getNode = (id: string) => tree.nodes.get(id) ?? null;
  const ensureParent = (id: string) => {
    const parent = getNode(id);
    if (!parent || parent.url) throw new Error("Invalid parent folder");
    parent.children = parent.children ?? [];
    return parent;
  };

  return {
    addFolder: (id: string, title: string, parentId = "0") => {
      const parent = ensureParent(parentId);
      const node: BookmarkNode = { id, title, parentId, children: [] };
      tree.nodes.set(id, node);
      parent.children?.push(node);
      return node;
    },
    addBookmark: (id: string, title: string, url: string, parentId = "0") => {
      const parent = ensureParent(parentId);
      const node: BookmarkNode = { id, title, url, parentId };
      tree.nodes.set(id, node);
      parent.children?.push(node);
      return node;
    },
    api: {
      getTree: async () => [tree.root],
      getChildren: async (parentId: string) =>
        (getNode(parentId)?.children ?? []).map((c) => ({ ...c })),
      getSubTree: async (id: string) =>
        getNode(id) ? [getNode(id)!] : [],
      create: async ({ parentId = "0", title, url }: { parentId?: string; title: string; url?: string }) => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
        return url
          ? { ...(this as unknown as { addBookmark: any }).addBookmark(id, title, url, parentId) }
          : { ...(this as unknown as { addFolder: any }).addFolder(id, title, parentId) };
      },
      remove: async (id: string) => {
        const node = getNode(id);
        if (!node) return;
        const parent = node.parentId ? getNode(node.parentId) : null;
        if (parent?.children) {
          parent.children = parent.children.filter((c) => c.id !== id);
        }
        tree.nodes.delete(id);
      },
      removeTree: async (id: string) => {
        const node = getNode(id);
        if (!node) return;
        const walk = (n: BookmarkNode) => {
          for (const child of n.children ?? []) walk(child);
          tree.nodes.delete(n.id);
        };
        walk(node);
        const parent = node.parentId ? getNode(node.parentId) : null;
        if (parent?.children) {
          parent.children = parent.children.filter((c) => c.id !== id);
        }
      },
    },
  };
}