import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

export function commonJavaRoots(environment: NodeJS.ProcessEnv): string[] {
  const roots: string[] = [];
  if (environment.ProgramFiles) {
    roots.push(
      path.win32.join(environment.ProgramFiles, "Java"),
      path.win32.join(environment.ProgramFiles, "Eclipse Adoptium"),
      path.win32.join(environment.ProgramFiles, "Microsoft"),
    );
  }
  if (environment.LOCALAPPDATA) {
    roots.push(path.win32.join(environment.LOCALAPPDATA, "Programs", "Eclipse Adoptium"));
  }
  return roots;
}

export function javaCandidates(
  savedPath: string | undefined,
  environmentPath: string | undefined,
  commonExecutables: string[],
  delimiter = path.delimiter,
): string[] {
  const ordered = [
    savedPath,
    ...(environmentPath ?? "")
      .split(delimiter)
      .filter(Boolean)
      .map((directory) => path.win32.join(directory, "java.exe")),
    ...commonExecutables,
  ].filter((candidate): candidate is string => Boolean(candidate));
  const seen = new Set<string>();
  return ordered.filter((candidate) => {
    const key = candidate.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export async function findCommonJavaExecutables(roots: string[]): Promise<string[]> {
  const candidates: string[] = [];
  for (const root of roots) {
    const direct = path.join(root, "bin", "java.exe");
    if (await exists(direct)) candidates.push(direct);
    try {
      const entries = await fs.readdir(root, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const candidate = path.join(root, entry.name, "bin", "java.exe");
        if (await exists(candidate)) candidates.push(candidate);
      }
    } catch {
      // Common installation root is absent.
    }
  }
  return candidates;
}

export function validateJava(executable: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(executable, ["-version"], { windowsHide: true });
    let settled = false;
    const finish = (valid: boolean) => {
      if (settled) return;
      settled = true;
      resolve(valid);
    };
    child.once("error", () => finish(false));
    child.once("close", (code) => finish(code === 0));
  });
}
