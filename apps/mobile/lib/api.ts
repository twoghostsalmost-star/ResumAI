import type { Resume, AtsScoreResult, ResumePatch } from "@resumeforge/shared";

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

// Bearer token is set after sign-in (see lib/session.ts). Kept in-module so the
// fetch wrapper can attach it without threading it through every call site.
let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers ?? {}),
    },
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

export type ParseResult = {
  resume: Resume;
  lowConfidenceFields: string[];
  method: string;
};

export const api = {
  session: (email: string, name?: string) =>
    req<{ token: string; user: { id: string; email: string; name?: string } }>(`/auth/session`, {
      method: "POST",
      body: JSON.stringify({ email, name }),
    }),

  me: () => req<{ id: string; email: string; name?: string }>(`/me`),

  listResumes: (userId?: string) =>
    req<ResumeListItem[]>(`/resumes${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`),

  getResume: (id: string) => req<Resume>(`/resumes/${id}`),

  createResume: (userId?: string, title?: string, source?: string, data?: Partial<Resume>) =>
    req<Resume>(`/resumes`, { method: "POST", body: JSON.stringify({ userId, title, source, data }) }),

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

  parseText: (text: string) =>
    req<ParseResult>(`/parse/text`, { method: "POST", body: JSON.stringify({ text }) }),

  share: (id: string) =>
    req<{ url: string; token: string; expiresAt: string }>(`/resumes/${id}/share`, { method: "POST" }),

  deleteAccount: () => req<void>(`/me`, { method: "DELETE" }),

  exportUrl: (id: string, format: "pdf" | "docx" | "html") =>
    `${BASE}/resumes/${id}/export?format=${format}`,

  exportMyDataUrl: () => `${BASE}/me/export`,
};
