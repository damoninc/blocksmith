# Forge Server Creation Fix Design

## Problem

Blocksmith currently discovers Forge builds by scraping Forge's downloads HTML with a broad version-number regular expression. The expression captures Minecraft-version navigation links such as `26.1.2` and `1.21.11` rather than Forge build numbers. Blocksmith then combines one of those values with the selected Minecraft version, producing a nonexistent Maven installer URL and a 404 during server creation.

## Design

Forge build discovery will use Forge's official Maven metadata at `https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml`. A focused parser will extract `<version>` values, retain only entries beginning with the exact selected Minecraft version followed by `-`, strip that prefix to obtain the Forge build number, remove duplicates, and preserve Maven's newest-first ordering for the UI.

The existing Forge installer download and `java -jar ... --installServer` workflow will remain unchanged. The selected build will continue to produce an artifact coordinate of `<minecraftVersion>-<forgeVersion>`.

If the Maven metadata request fails, the existing IPC error propagation will expose the request error. If metadata contains no builds for the selected Minecraft version, Forge discovery will reject with a clear compatibility error instead of rendering an empty, actionable-looking form. The renderer will display this error in the creation view and disable submission until a valid Forge build is available.

## Boundaries

- Do not change Vanilla, Paper, or Fabric creation.
- Do not change Forge startup after installation.
- Do not introduce a new XML dependency; the metadata structure needed here is small and can be parsed with a narrowly scoped extractor.
- Do not add automatic Java installation or version management in this fix.

## Testing

- Unit-test Maven metadata parsing with multiple Minecraft versions and duplicate entries.
- Verify exact matching so `1.21` does not consume `1.21.1` builds.
- Add a regression test proving the old Forge HTML scraper is gone and Maven metadata powers the Forge IPC handler.
- Test renderer loading and error states, including disabled creation while Forge builds are unavailable.
- Run the complete test suite, TypeScript check, production build, and Electron launch smoke test before merging.
