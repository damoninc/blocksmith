export function forgeBuildsForMinecraft(
  metadataXml: string,
  minecraftVersion: string,
): string[] {
  const prefix = `${minecraftVersion}-`;
  const builds: string[] = [];
  const seen = new Set<string>();

  for (const match of metadataXml.matchAll(/<version\b[^>]*>([\s\S]*?)<\/version\s*>/gi)) {
    const version = match[1].trim();
    if (!version.startsWith(prefix)) continue;

    const build = version.slice(prefix.length).trim();
    if (!build || seen.has(build)) continue;

    seen.add(build);
    builds.push(build);
  }

  return builds;
}
