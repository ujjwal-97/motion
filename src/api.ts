import { invoke } from "@tauri-apps/api/core";
import type { PageMeta, SearchResult, WorkspaceMeta } from "./types";

export const api = {
  listPages: () => invoke<PageMeta[]>("list_pages"),

  createPage: (parentId: string | null, title: string) =>
    invoke<PageMeta>("create_page", { parentId, title }),

  updatePageTitle: (id: string, title: string) =>
    invoke<void>("update_page_title", { id, title }),

  updatePageIcon: (id: string, icon: string) =>
    invoke<void>("update_page_icon", { id, icon }),

  updatePageContent: (id: string, content: string) =>
    invoke<void>("update_page_content", { id, content }),

  getPageContent: (id: string) => invoke<string>("get_page_content", { id }),

  deletePage: (id: string) => invoke<void>("delete_page", { id }),

  movePage: (id: string, parentId: string | null, position: number) =>
    invoke<void>("move_page", { id, parentId, position }),

  searchPages: (query: string) => invoke<SearchResult[]>("search_pages", { query }),

  listWorkspaces: () => invoke<WorkspaceMeta[]>("list_workspaces"),

  getActiveWorkspace: () => invoke<WorkspaceMeta>("get_active_workspace"),

  createWorkspace: (name?: string) =>
    invoke<WorkspaceMeta>("create_workspace", { name: name ?? null }),

  switchWorkspace: (id: string) =>
    invoke<WorkspaceMeta>("switch_workspace", { id }),

  updateWorkspace: (
    id: string,
    options?: { name?: string; icon?: string }
  ) =>
    invoke<WorkspaceMeta>("update_workspace", {
      id,
      name: options?.name ?? null,
      icon: options?.icon ?? null,
    }),

  deleteWorkspace: (id: string) =>
    invoke<WorkspaceMeta>("delete_workspace", { id }),

  getWorkspaceName: () => invoke<string>("get_workspace_name"),

  updateWorkspaceName: (name: string) =>
    invoke<void>("update_workspace_name", { name }),

  exportPages: (pageIds: string[], destination: string) =>
    invoke<{ exportedCount: number; destination: string }>("export_pages", {
      pageIds,
      destination,
    }),

  importPages: (source: string) =>
    invoke<{ importedCount: number; source: string }>("import_pages", {
      source,
    }),
};
