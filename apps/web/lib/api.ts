import type { Resume, AtsScoreResult, ResumePatch } from "@resumeforge/shared";
import { getToken } from "./auth";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`${status} ${body}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type ReqInit = Omit<RequestInit, "body"> & { body?: unknown; raw?: boolean };

async function req<T>(path: string, init: ReqInit = {}): Promise<T> {
  const { body, raw, headers, ...rest } = init;
  const token = getToken();
  const finalHeaders: Record<string, string> = {
    ...(raw ? {} : { "content-type": "application/json" }),
    ...((headers as Record<string, string>) ?? {}),
  };
  if (token) finalHeaders["authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: raw ? (body as BodyInit) : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let text = "";
    try {
      text = await res.text();
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, text);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return (await res.text()) as unknown as T;
  return (await res.json()) as T;
}

// ---- Domain types for list/parse/share responses ----

export type AuthSessionResponse = {
  token: string;
  user: { id: string; email: string; name?: string };
};

export type Me = { id: string; email: string; name?: string | null };

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

export type AssistantResponse = { reply: string; patches: ResumePatch[] };

export type ShareResponse = { url: string; token: string; expiresAt: string };

export type LinkedInAuthUrl = { url: string; state: string };

export const api = {
  // ---- auth ----
  createSession: (email: string, name?: string) =>
    req<AuthSessionResponse>("/auth/session", {
      method: "POST",
      body: { email, ...(name ? { name } : {}) },
    }),

  me: () => req<Me>("/me"),

  exportMyData: () => req<unknown>("/me/export"),

  deleteAccount: () => req<void>("/me", { method: "DELETE" }),

  // ---- resumes ----
  listResumes: () => req<ResumeListItem[]>("/resumes"),

  getResume: (id: string) => req<Resume>(`/resumes/${id}`),

  createResume: (input: {
    title?: string;
    source?: Resume["source"];
    data?: Partial<Resume>;
  }) => req<Resume>("/resumes", { method: "POST", body: input }),

  saveResume: (resume: Resume) =>
    req<Resume>(`/resumes/${resume.id}`, { method: "PUT", body: resume }),

  applyPatches: (id: string, patches: ResumePatch[]) =>
    req<Resume>(`/resumes/${id}/patch`, { method: "POST", body: { patches } }),

  deleteResume: (id: string) =>
    req<void>(`/resumes/${id}`, { method: "DELETE" }),

  // ---- scoring ----
  score: (id: string) =>
    req<AtsScoreResult>(`/resumes/${id}/score`, { method: "POST" }),

  scoreStateless: (resume: Resume) =>
    req<AtsScoreResult>("/ats/score", { method: "POST", body: resume }),

  // ---- assistant ----
  assistant: (id: string, message: string) =>
    req<AssistantResponse>(`/resumes/${id}/assistant`, {
      method: "POST",
      body: { message },
    }),

  // ---- parsing / import ----
  parseText: (text: string) =>
    req<ParseResult>("/parse/text", { method: "POST", body: { text } }),

  parseUpload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return req<ParseResult>("/parse/upload", {
      method: "POST",
      raw: true,
      body: form,
    });
  },

  // ---- sharing / export ----
  share: (id: string) =>
    req<ShareResponse>(`/resumes/${id}/share`, { method: "POST" }),

  exportUrl: (id: string, format: "pdf" | "docx" | "html") =>
    `${API_BASE}/resumes/${id}/export?format=${format}`,

  // ---- linkedin ----
  linkedinAuthUrl: () => req<LinkedInAuthUrl>("/linkedin/auth-url"),

  // ---- social sign-in (full-page redirects handled by the API) ----
  googleSignInUrl: `${API_BASE}/auth/google/start`,
  appleSignInUrl: `${API_BASE}/auth/apple/start`,
};
