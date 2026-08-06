const API_ROOT = "https://api.modrinth.com/v2";
const CDN_ROOT = "https://cdn.modrinth.com";

export const modrinthRequest = {
  headers: {
    "User-Agent":
      "damoninc/blocksmith/1.0.0 (https://github.com/damoninc/blocksmith)",
  },
};

export type ModrinthPlugin = {
  projectId: string;
  slug: string;
  title: string;
  description: string;
  author: string;
  iconUrl: string | null;
  downloads: number;
};

type SearchResponse = {
  hits: Array<{
    project_id: string;
    slug: string;
    title: string;
    description: string;
    author: string;
    icon_url: string | null;
    downloads: number;
  }>;
};

type ModrinthVersion = {
  version_type: "release" | "beta" | "alpha";
  files: Array<{
    url: string;
    filename: string;
    primary: boolean;
    file_type: string | null;
  }>;
};

async function responseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Modrinth request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export async function searchModrinthPlugins(
  gameVersion: string,
  query = "",
  request: typeof fetch = fetch,
): Promise<ModrinthPlugin[]> {
  if (!gameVersion.trim()) throw new Error("A Minecraft version is required.");
  const facets = [
    ["all_project_types:plugin"],
    ["categories:paper"],
    [`versions:${gameVersion}`],
    ["server_side:required", "server_side:optional"],
  ];
  const params = new URLSearchParams({
    query: query.trim(),
    facets: JSON.stringify(facets),
    index: query.trim() ? "relevance" : "downloads",
    limit: "20",
  });
  const response = await request(`${API_ROOT}/search?${params}`, modrinthRequest);
  const result = await responseJson<SearchResponse>(response);
  return result.hits.map((hit) => ({
    projectId: hit.project_id,
    slug: hit.slug,
    title: hit.title,
    description: hit.description,
    author: hit.author,
    iconUrl: hit.icon_url,
    downloads: hit.downloads,
  }));
}

export async function resolveModrinthPluginDownload(
  projectId: string,
  gameVersion: string,
  request: typeof fetch = fetch,
): Promise<{ url: string; filename: string }> {
  if (!/^[\w!@$().+,"'-]{3,64}$/.test(projectId)) {
    throw new Error("Invalid Modrinth project.");
  }
  const params = new URLSearchParams({
    loaders: JSON.stringify(["paper"]),
    game_versions: JSON.stringify([gameVersion]),
    include_changelog: "false",
  });
  const response = await request(
    `${API_ROOT}/project/${encodeURIComponent(projectId)}/version?${params}`,
    modrinthRequest,
  );
  const versions = await responseJson<ModrinthVersion[]>(response);
  const version =
    versions.find((candidate) => candidate.version_type === "release") ??
    versions[0];
  const file =
    version?.files.find(
      (candidate) =>
        candidate.primary &&
        candidate.file_type !== "sources-jar" &&
        candidate.file_type !== "dev-jar" &&
        candidate.file_type !== "javadoc-jar" &&
        candidate.filename.toLowerCase().endsWith(".jar"),
    ) ??
    version?.files.find(
      (candidate) =>
        candidate.file_type !== "sources-jar" &&
        candidate.file_type !== "dev-jar" &&
        candidate.file_type !== "javadoc-jar" &&
        candidate.filename.toLowerCase().endsWith(".jar"),
    );
  if (!file) {
    throw new Error(
      `No Paper plugin is available for Minecraft ${gameVersion}.`,
    );
  }
  const url = new URL(file.url);
  if (url.protocol !== "https:" || url.origin !== CDN_ROOT) {
    throw new Error("Modrinth returned an unsafe plugin download URL.");
  }
  return { url: url.toString(), filename: file.filename };
}
