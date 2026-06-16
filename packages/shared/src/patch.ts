import { z } from "zod";
import { Resume, ResumeSchema } from "./resume";

/**
 * ResumePatch — a JSON-path-style mutation proposed by the assistant or an
 * ATS auto-fix. Applied immutably. This is complete, working logic (no I/O).
 */
export const ResumePatchSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set"), path: z.string(), value: z.any() }),
  z.object({ op: z.literal("push"), path: z.string(), value: z.any() }),
  z.object({ op: z.literal("removeAt"), path: z.string(), index: z.number().int() }),
  z.object({ op: z.literal("move"), path: z.string(), from: z.number().int(), to: z.number().int() }),
]);
export type ResumePatch = z.infer<typeof ResumePatchSchema>;

function getParent(root: any, path: string): { parent: any; key: string } {
  const parts = path.split(".").filter(Boolean);
  let node = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const idx = Number(k);
    node = Array.isArray(node) && !Number.isNaN(idx) ? node[idx] : node[k];
    if (node === undefined) throw new Error(`Invalid patch path segment: ${k}`);
  }
  return { parent: node, key: parts[parts.length - 1] };
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

/** Apply a single patch to a resume, returning a new resume. Validates result. */
export function applyPatch(resume: Resume, patch: ResumePatch): Resume {
  const next = clone(resume) as any;
  const { parent, key } = getParent(next, patch.path);
  const idx = Number(key);
  const target = Array.isArray(parent) && !Number.isNaN(idx) ? parent : parent;
  const accessKey = Array.isArray(parent) && !Number.isNaN(idx) ? idx : key;

  switch (patch.op) {
    case "set":
      target[accessKey] = patch.value;
      break;
    case "push": {
      const arr = target[accessKey];
      if (!Array.isArray(arr)) throw new Error(`push target is not an array: ${patch.path}`);
      arr.push(patch.value);
      break;
    }
    case "removeAt": {
      const arr = target[accessKey];
      if (!Array.isArray(arr)) throw new Error(`removeAt target is not an array: ${patch.path}`);
      arr.splice(patch.index, 1);
      break;
    }
    case "move": {
      const arr = target[accessKey];
      if (!Array.isArray(arr)) throw new Error(`move target is not an array: ${patch.path}`);
      const [moved] = arr.splice(patch.from, 1);
      arr.splice(patch.to, 0, moved);
      break;
    }
  }

  next.updatedAt = new Date().toISOString();
  return ResumeSchema.parse(next);
}

export function applyPatches(resume: Resume, patches: ResumePatch[]): Resume {
  return patches.reduce((acc, p) => applyPatch(acc, p), resume);
}
