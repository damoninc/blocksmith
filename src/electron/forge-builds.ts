import { forgeBuildsForMinecraft } from "./forge-metadata";

const forgeMetadataUrl =
  "https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml";

export async function fetchForgeBuildsForMinecraft(
  minecraftVersion: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const response = await fetchImpl(forgeMetadataUrl);
  if (!response.ok) {
    throw new Error(`Forge build request failed (${response.status}).`);
  }

  const builds = forgeBuildsForMinecraft(
    await response.text(),
    minecraftVersion,
  );
  if (builds.length === 0) {
    throw new Error(
      `No Forge builds are available for Minecraft ${minecraftVersion}.`,
    );
  }
  return builds;
}
