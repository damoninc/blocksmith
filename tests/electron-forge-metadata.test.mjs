import assert from "node:assert/strict";
import { test } from "node:test";
import { forgeBuildsForMinecraft } from "../dist/main/forge-metadata.js";

test("returns deduplicated Forge builds for the exact Minecraft version in source order", () => {
  const metadataXml = `
    <metadata>
      <versioning>
        <versions>
          <version>1.21-51.0.33</version>
          <version>1.21.1-52.1.16</version>
          <version>1.21.1-52.1.0</version>
          <version>1.21.1-52.1.16</version>
        </versions>
      </versioning>
    </metadata>
  `;

  assert.deepEqual(forgeBuildsForMinecraft(metadataXml, "1.21.1"), [
    "52.1.16",
    "52.1.0",
  ]);
  assert.deepEqual(forgeBuildsForMinecraft(metadataXml, "1.21"), [
    "51.0.33",
  ]);
});
