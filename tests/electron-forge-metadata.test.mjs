import assert from "node:assert/strict";
import { test } from "node:test";
import { forgeBuildsForMinecraft } from "../dist/main/forge-metadata.js";

test("returns exact-version Forge builds in numeric-aware descending order", () => {
  const metadataXml = `
    <metadata>
      <versioning>
        <versions>
          <version>1.21-51.0.33</version>
          <version>1.21.1-52.1.2</version>
          <version>1.21.1-52.1.16</version>
          <version>1.21.1-52.1.0</version>
          <version>1.21.1-52.1.16</version>
        </versions>
      </versioning>
    </metadata>
  `;

  assert.deepEqual(forgeBuildsForMinecraft(metadataXml, "1.21.1"), [
    "52.1.16",
    "52.1.2",
    "52.1.0",
  ]);
  assert.deepEqual(forgeBuildsForMinecraft(metadataXml, "1.21"), [
    "51.0.33",
  ]);
});

test("ignores version-like markup that is not direct version text", () => {
  const metadataXml = `
    <version>1.21.1-100.0.0</version>
    <metadata>
      <versioning>
        <versions>
          <!-- <version>1.21.1-99.0.0</version> -->
          <![CDATA[<version>1.21.1-98.0.0</version>]]>
          <version><build>1.21.1-97.0.0</build></version>
          <version>1.21.1-96.0.0<broken></version>
          <version> 1.21.1-52.1&#46;4 </version>
        </versions>
      </versioning>
    </metadata>
  `;

  assert.deepEqual(forgeBuildsForMinecraft(metadataXml, "1.21.1"), [
    "52.1.4",
  ]);
  assert.deepEqual(
    forgeBuildsForMinecraft(
      "<versions><version>1.21.1-52&amp;1</version></versions>",
      "1.21.1",
    ),
    ["52&1"],
  );
});
