import { create } from "zustand";
import { api } from "./api";
import type { PageMeta, SearchResult } from "./types";

let saveTimer: ReturnType<typeof setTimeout> | null = null;

interface AppStore {
  // ── Page data ──
  pages: PageMeta[];
  activePageId: string | null;
  activeContent: string;
  openTabIds: string[];

  // ── Workspace ──
  workspaceName: string;

  // ── UI state ──
  sidebarOpen: boolean;
  commandMenuOpen: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // ── Actions ──
  loadPages: () => Promise<void>;
  loadWorkspace: () => Promise<void>;
  updateWorkspaceName: (name: string) => Promise<void>;
  exportPages: (
    pageIds: string[],
    destination: string,
    options?: { activePageId: string | null; activeContent: string }
  ) => Promise<{ exportedCount: number; destination: string }>;
  selectPage: (id: string, options?: { switchOnly?: boolean }) => Promise<void>;
  closeTab: (id: string) => void;
  openNewTab: () => Promise<PageMeta>;
  createPage: (parentId?: string | null) => Promise<PageMeta>;
  updateTitle: (id: string, title: string) => Promise<void>;
  updateIcon: (id: string, icon: string) => Promise<void>;
  scheduleContentSave: (id: string, content: string) => void;
  deletePage: (id: string) => Promise<void>;
  movePage: (id: string, parentId: string | null, position: number) => Promise<void>;
  searchPages: (query: string) => Promise<SearchResult[]>;
  setSidebarOpen: (open: boolean) => void;
  toggleCommandMenu: () => void;
  setActiveContent: (content: string) => void;
  clearError: () => void;
}

export const useStore = create<AppStore>((set, get) => ({
  pages: [],
  activePageId: null,
  activeContent: "",
  openTabIds: [],
  workspaceName: "My Workspace",
  sidebarOpen: true,
  commandMenuOpen: false,
  isLoading: false,
  isSaving: false,
  error: null,

  loadPages: async () => {
    set({ isLoading: true, error: null });
    try {
      const pages = await api.listPages();
      set((s) => ({
        pages,
        isLoading: false,
        openTabIds: s.openTabIds.filter((id) => pages.some((p) => p.id === id)),
      }));
    } catch (e) {
      console.error("Failed to load pages:", e);
      set({
        isLoading: false,
        error: formatError(e, "Could not load pages"),
      });
    }
  },

  loadWorkspace: async () => {
    try {
      const workspaceName = await api.getWorkspaceName();
      set({ workspaceName, error: null });
    } catch (e) {
      console.error("Failed to load workspace:", e);
      set({ error: formatError(e, "Could not load workspace") });
    }
  },

  updateWorkspaceName: async (name: string) => {
    const trimmed = name.trim() || "My Workspace";
    try {
      await api.updateWorkspaceName(trimmed);
      set({ workspaceName: trimmed, error: null });
    } catch (e) {
      const message = formatError(e, "Could not rename workspace");
      set({ error: message });
      throw new Error(message);
    }
  },

  exportPages: async (pageIds, destination, options) => {
    try {
      if (
        options?.activePageId &&
        pageIds.includes(options.activePageId) &&
        options.activeContent !== undefined
      ) {
        await api.updatePageContent(
          options.activePageId,
          options.activeContent
        );
      }

      const result = await api.exportPages(pageIds, destination);
      set({ error: null });
      return result;
    } catch (e) {
      const message = formatError(e, "Could not export workspace");
      set({ error: message });
      throw new Error(message);
    }
  },

  selectPage: async (id: string, options?: { switchOnly?: boolean }) => {
    const { activePageId, openTabIds } = get();
    if (activePageId === id) return;

    const switchOnly = options?.switchOnly ?? false;

    if (switchOnly) {
      if (!openTabIds.includes(id)) return;
      set({ activeContent: "", activePageId: id });
    } else {
      const existingIndex = openTabIds.indexOf(id);
      if (existingIndex !== -1) {
        set({ activeContent: "", activePageId: id });
      } else {
        set((s) => {
          const nextTabs = [...s.openTabIds];
          if (nextTabs.length === 0) {
            nextTabs.push(id);
          } else {
            const activeIndex = s.activePageId
              ? nextTabs.indexOf(s.activePageId)
              : -1;
            const slot = activeIndex !== -1 ? activeIndex : nextTabs.length - 1;
            nextTabs[slot] = id;
          }
          return { openTabIds: nextTabs, activePageId: id, activeContent: "" };
        });
      }
    }

    try {
      const content = await api.getPageContent(id);
      set({ activeContent: content });
    } catch (e) {
      console.error("Failed to get page content:", e);
    }
  },

  closeTab: (id: string) => {
    const { openTabIds, activePageId } = get();
    const index = openTabIds.indexOf(id);
    if (index === -1) return;

    const nextTabs = openTabIds.filter((tabId) => tabId !== id);

    if (activePageId !== id) {
      set({ openTabIds: nextTabs });
      return;
    }

    const nextActive = nextTabs[index] ?? nextTabs[index - 1] ?? null;
    if (nextActive) {
      set({ openTabIds: nextTabs });
      void get().selectPage(nextActive, { switchOnly: true });
    } else {
      set({ openTabIds: nextTabs, activePageId: null, activeContent: "" });
    }
  },

  openNewTab: async () => {
    const page = await get().createPage(null);
    set((s) => ({
      openTabIds: [...s.openTabIds, page.id],
      activePageId: page.id,
      activeContent: "",
    }));
    try {
      const content = await api.getPageContent(page.id);
      set({ activeContent: content });
    } catch (e) {
      console.error("Failed to get page content:", e);
    }
    return page;
  },

  createPage: async (parentId = null) => {
    try {
      const page = await api.createPage(parentId, "Untitled");
      set((s) => ({ pages: [...s.pages, page], error: null }));
      return page;
    } catch (e) {
      const message = formatError(e, "Could not create page");
      set({ error: message });
      throw new Error(message);
    }
  },

  updateTitle: async (id: string, title: string) => {
    await api.updatePageTitle(id, title);
    set((s) => ({
      pages: s.pages.map((p) => (p.id === id ? { ...p, title } : p)),
    }));
  },

  updateIcon: async (id: string, icon: string) => {
    await api.updatePageIcon(id, icon);
    set((s) => ({
      pages: s.pages.map((p) => (p.id === id ? { ...p, icon } : p)),
    }));
  },

  scheduleContentSave: (id: string, content: string) => {
    set({ activeContent: content });
    if (saveTimer) clearTimeout(saveTimer);
    set({ isSaving: true });
    saveTimer = setTimeout(async () => {
      try {
        await api.updatePageContent(id, content);
      } catch (e) {
        console.error("Failed to save content:", e);
      } finally {
        set({ isSaving: false });
      }
    }, 1000);
  },

  deletePage: async (id: string) => {
    await api.deletePage(id);
    const { activePageId, openTabIds } = get();
    const nextTabs = openTabIds.filter((tabId) => tabId !== id);
    const index = openTabIds.indexOf(id);

    if (activePageId === id) {
      const nextActive = nextTabs[index] ?? nextTabs[index - 1] ?? null;
      set((s) => ({
        pages: s.pages.filter((p) => p.id !== id && p.parentId !== id),
        openTabIds: nextTabs,
      }));
      if (nextActive) {
        await get().selectPage(nextActive, { switchOnly: true });
      } else {
        set({ activePageId: null, activeContent: "" });
      }
      return;
    }

    set((s) => ({
      pages: s.pages.filter((p) => p.id !== id && p.parentId !== id),
      openTabIds: nextTabs,
    }));
  },

  movePage: async (id: string, parentId: string | null, position: number) => {
    await api.movePage(id, parentId, position);
    set((s) => ({
      pages: s.pages.map((p) =>
        p.id === id ? { ...p, parentId, position } : p
      ),
    }));
  },

  searchPages: (query: string) => api.searchPages(query),

  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  toggleCommandMenu: () =>
    set((s) => ({ commandMenuOpen: !s.commandMenuOpen })),

  setActiveContent: (content: string) => set({ activeContent: content }),

  clearError: () => set({ error: null }),
}));

function formatError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}
