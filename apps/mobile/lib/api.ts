import type { Resume, AtsScoreResult, ResumePatch } from "@resumeforge/shared";

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type ResumeListItem = {
  id: string;
  title: string;
  source: string;
  updatedAt: string;
  atsScore?: AtsScoreResult | null;
};

export const api = {
  listResumes: (userId: string) =>
    req<ResumeListItem[]>(`/resumes?userId=${encodeURIComponent(userId)}`),

  getResume: (id: string) => req<Resume>(`/resumes/${id}`),

  createResume: (userId: string, title?: string, source?: string) =>
    req<Resume>(`/resumes`, { method: "POST", body: JSON.stringify({ userId, title, source }) }),

  saveResume: (resume: Resume) =>
    req<Resume>(`/resumes/${resume.id}`, { method: "PUT", body: JSON.stringify(resume) }),

  applyPatches: (id: string, patches: ResumePatch[]) =>
    req<Resume>(`/resumes/${id}/patch`, { method: "POST", body: JSON.stringify({ patches }) }),

  deleteResume: (id: string) => req<void>(`/resumes/${id}`, { method: "DELETE" }),

  score: (id: string) => req<AtsScoreResult>(`/resumes/${id}/score`, { method: "POST" }),

  assistant: (id: string, message: string) =>
    req<{ reply: string; patches: ResumePatch[] }>(`/resumes/${id}/assistant`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  exportUrl: (id: string, format: "pdf" | "docx" | "html") =>
    `${BASE}/resumes/${id}/export?format=${format}`,
};
