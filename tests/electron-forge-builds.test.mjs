import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchForgeBuildsForMinecraft } from "../dist/main/forge-builds.js";

const metadata = (...versions) => `
  <metadata>
    <versioning>
      <versions>
        ${versions.map((version) => `<version>${version}</version>`).join("\n")}
      </versions>
    </versioning>
  </metadata>
`;

test("fetches official Forge metadata and returns exact-version builds", async () => {
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(url);
    return {
      ok: true,
      status: 200,
      text: async () => metadata("1.21.1-52.0.1", "1.21-51.0.3"),
    };
  };

  assert.deepEqual(
    await fetchForgeBuildsForMinecraft("1.21.1", fetchImpl),
    ["52.0.1"],
  );
  assert.deepEqual(requests, [
    "https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml",
  ]);
});

test("reports a useful error for a failed Forge metadata response", async () => {
  const fetchImpl = async () => ({ ok: false, status: 503 });

  await assert.rejects(
    fetchForgeBuildsForMinecraft("1.21.1", fetchImpl),
    /Forge build request failed \(503\)\./,
  );
});

test("reports when Forge metadata has no builds for the Minecraft version", async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    text: async () => metadata("1.21-51.0.3"),
  });

  await assert.rejects(
    fetchForgeBuildsForMinecraft("1.21.1", fetchImpl),
    /No Forge builds are available for Minecraft 1\.21\.1\./,
  );
});

test("propagates Forge metadata network failures", async () => {
  const networkFailure = new Error("connection reset");
  const fetchImpl = async () => {
    throw networkFailure;
  };

  await assert.rejects(
    fetchForgeBuildsForMinecraft("1.21.1", fetchImpl),
    (error) => error === networkFailure,
  );
});
