"use client";

import { create } from "zustand";
import type { Resume, ResumePatch } from "@resumeforge/shared";
import { api } from "./api";

type State = {
  resume: Resume | null;
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  error: string | null;
  load: (id: string) => Promise<void>;
  save: () => Promise<void>;
  setResume: (r: Resume) => void;
  /** Mutate the active resume locally and mark dirty (does not hit the server). */
  update: (updater: (r: Resume) => Resume) => void;
  /** Server-side apply of assistant / ATS patches, replaces resume with result. */
  acceptPatches: (patches: ResumePatch[]) => Promise<void>;
  clear: () => void;
};

export const useResumeStore = create<State>((set, get) => ({
  resume: null,
  loading: false,
  saving: false,
  dirty: false,
  error: null,

  load: async (id) => {
    set({ loading: true, error: null });
    try {
      const resume = await api.getResume(id);
      set({ resume, dirty: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to load" });
    } finally {
      set({ loading: false });
    }
  },

  save: async () => {
    const r = get().resume;
    if (!r) return;
    set({ saving: true, error: null });
    try {
      const saved = await api.saveResume(r);
      set({ resume: saved, dirty: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to save" });
    } finally {
      set({ saving: false });
    }
  },

  setResume: (r) => set({ resume: r, dirty: false }),

  update: (updater) => {
    const r = get().resume;
    if (!r) return;
    set({ resume: updater(r), dirty: true });
  },

  acceptPatches: async (patches) => {
    const r = get().resume;
    if (!r) return;
    set({ saving: true, error: null });
    try {
      const updated = await api.applyPatches(r.id, patches);
      set({ resume: updated, dirty: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to apply changes" });
    } finally {
      set({ saving: false });
    }
  },

  clear: () => set({ resume: null, dirty: false, error: null }),
}));
