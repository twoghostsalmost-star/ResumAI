import { create } from "zustand";
import type { Resume, ResumePatch } from "@resumeforge/shared";
import { api } from "../lib/api";

// Single-device demo identity. Replace with real auth (expo-secure-store) in M0.
export const DEMO_USER_ID = "demo-user";

type State = {
  resume: Resume | null;
  loading: boolean;
  load: (id: string) => Promise<void>;
  save: () => Promise<void>;
  setResume: (r: Resume) => void;
  acceptPatches: (patches: ResumePatch[]) => Promise<void>;
};

export const useResumeStore = create<State>((set, get) => ({
  resume: null,
  loading: false,

  load: async (id) => {
    set({ loading: true });
    try {
      const resume = await api.getResume(id);
      set({ resume });
    } finally {
      set({ loading: false });
    }
  },

  save: async () => {
    const r = get().resume;
    if (!r) return;
    const saved = await api.saveResume(r);
    set({ resume: saved });
  },

  setResume: (r) => set({ resume: r }),

  acceptPatches: async (patches) => {
    const r = get().resume;
    if (!r) return;
    const updated = await api.applyPatches(r.id, patches);
    set({ resume: updated });
  },
}));
