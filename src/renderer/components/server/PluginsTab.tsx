import { useCallback, useEffect, useRef, useState } from "react";
import type { ModrinthPlugin, ModrinthSort, Server } from "../../types";

type PluginsTabProps = {
  server: Server;
  plugins: string[];
  onChange: (plugins: string[]) => void;
  onNotify: (message: string) => void;
};

function downloadCount(downloads: number): string {
  return new Intl.NumberFormat(undefined, { notation: "compact" }).format(
    downloads,
  );
}

export function PluginsTab({
  server,
  plugins,
  onChange,
  onNotify,
}: PluginsTabProps) {
  const input = useRef<HTMLInputElement>(null);
  const searchRequest = useRef(0);
  const debounceTimer = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ModrinthSort>("downloads");
  const [results, setResults] = useState<ModrinthPlugin[]>([]);
  const [searching, setSearching] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [fileError, setFileError] = useState("");
  const [catalogError, setCatalogError] = useState("");

  const search = useCallback(
    async (requestedQuery: string, requestedSort: ModrinthSort) => {
      const requestId = ++searchRequest.current;
      setSearching(true);
      setCatalogError("");
      try {
        const found = await window.blocksmith.searchModrinthPlugins(
          server.id,
          requestedQuery,
          requestedSort,
        );
        if (requestId === searchRequest.current) setResults(found);
      } catch (searchError) {
        if (requestId === searchRequest.current) {
          setCatalogError(
            searchError instanceof Error
              ? searchError.message
              : "Could not search Modrinth.",
          );
        }
      } finally {
        if (requestId === searchRequest.current) setSearching(false);
      }
    },
    [server.id],
  );

  useEffect(() => {
    debounceTimer.current = window.setTimeout(() => {
      debounceTimer.current = null;
      void search(query, sort);
    }, 350);
    return () => {
      searchRequest.current += 1;
      if (debounceTimer.current !== null) {
        window.clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, [query, search, sort]);

  const addFiles = async (files: FileList | File[]) => {
    const selected = Array.from(files);
    if (!selected.length) return;
    if (selected.length > 20) {
      setFileError("Add no more than 20 plugins at once.");
      return;
    }
    if (selected.some((file) => !file.name.toLowerCase().endsWith(".jar"))) {
      setFileError("Only plugin .jar files can be added.");
      return;
    }
    if (
      selected.reduce((total, file) => total + file.size, 0) >
      256 * 1024 * 1024
    ) {
      setFileError("The selected plugins are larger than the 256 MB batch limit.");
      return;
    }

    setUploading(true);
    setFileError("");
    try {
      const uploads = await Promise.all(
        selected.map(async (file) => ({
          name: file.name,
          data: new Uint8Array(await file.arrayBuffer()),
        })),
      );
      const installed = await window.blocksmith.addPlugins(server.id, uploads);
      onChange(installed);
      onNotify(
        `${selected.length} plugin${selected.length === 1 ? "" : "s"} added.`,
      );
    } catch (uploadError) {
      setFileError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not add plugin files.",
      );
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  const install = async (plugin: ModrinthPlugin) => {
    setInstalling(plugin.projectId);
    setCatalogError("");
    try {
      const installed = await window.blocksmith.installModrinthPlugin(
        server.id,
        plugin.projectId,
      );
      onChange(installed);
      onNotify(`${plugin.title} installed from Modrinth.`);
    } catch (installError) {
      setCatalogError(
        installError instanceof Error
          ? installError.message
          : `Could not install ${plugin.title}.`,
      );
    } finally {
      setInstalling(null);
    }
  };

  const openDetails = async (plugin: ModrinthPlugin) => {
    setCatalogError("");
    try {
      await window.blocksmith.openModrinthPlugin(plugin.slug);
    } catch (openError) {
      setCatalogError(
        openError instanceof Error
          ? openError.message
          : `Could not open ${plugin.title} on Modrinth.`,
      );
    }
  };

  return (
    <div className="plugin-manager">
      <section className="card">
        <div className="tabtitle">
          <div>
            <h2>Installed plugins</h2>
            <p>
              Paper {server.version} loads plugin <code>.jar</code> files from
              its plugins folder.
            </p>
          </div>
        </div>
        <div
          className={`plugin-dropzone ${dragging ? "dragging" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="Add plugin JAR files"
          aria-disabled={uploading}
          onClick={() => input.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              input.current?.click();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void addFiles(event.dataTransfer.files);
          }}
        >
          <strong>
            {uploading ? "Adding plugins..." : "Drop plugin JARs here"}
          </strong>
          <span>or click to choose files</span>
        </div>
        <input
          ref={input}
          className="visually-hidden"
          type="file"
          accept=".jar,application/java-archive"
          multiple
          disabled={uploading}
          onChange={(event) => {
            if (event.target.files) void addFiles(event.target.files);
          }}
        />
        {fileError && (
          <p className="form-error" role="alert">
            {fileError}
          </p>
        )}
        <ul className="modlist plugin-list">
          {plugins.length ? (
            plugins.map((plugin) => <li key={plugin}>{plugin}</li>)
          ) : (
            <li className="muted">No plugins installed yet.</li>
          )}
        </ul>
      </section>

      <section className="card modrinth-browser">
        <div className="tabtitle">
          <div>
            <p className="eyebrow">MODRINTH</p>
            <h2>Browse Paper plugins</h2>
            <p>
              Compatible with Minecraft {server.version} and ready to install.
            </p>
          </div>
        </div>
        <form
          className="plugin-search"
          onSubmit={(event) => {
            event.preventDefault();
            if (debounceTimer.current !== null) {
              window.clearTimeout(debounceTimer.current);
              debounceTimer.current = null;
            }
            void search(query, sort);
          }}
        >
          <label className="visually-hidden" htmlFor="plugin-search">
            Search Modrinth plugins
          </label>
          <input
            id="plugin-search"
            type="search"
            value={query}
            placeholder="Search permissions, maps, claims..."
            onChange={(event) => setQuery(event.target.value)}
          />
          <label className="plugin-sort">
            <span>Sort</span>
            <select
              aria-label="Sort plugins"
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as ModrinthSort)
              }
            >
              <option value="downloads">Popular</option>
              <option value="relevance">Relevance</option>
              <option value="updated">Recently updated</option>
            </select>
          </label>
          <button type="submit">Search</button>
        </form>
        {catalogError && (
          <p className="form-error" role="alert">
            {catalogError}
          </p>
        )}
        {searching ? (
          <p className="plugin-browser-state" role="status" aria-live="polite">
            Loading compatible plugins...
          </p>
        ) : results.length ? (
          <div className="plugin-results">
            {results.map((plugin) => (
              <article className="plugin-result" key={plugin.projectId}>
                {plugin.iconUrl ? (
                  <img src={plugin.iconUrl} alt="" />
                ) : (
                  <span className="plugin-icon-fallback" aria-hidden="true">
                    {plugin.title[0]?.toUpperCase()}
                  </span>
                )}
                <div className="plugin-result-copy">
                  <h3>{plugin.title}</h3>
                  <p>{plugin.description}</p>
                  <small>
                    by {plugin.author} · {downloadCount(plugin.downloads)}{" "}
                    downloads
                  </small>
                  <button
                    type="button"
                    className="plugin-details-link"
                    aria-label={`View ${plugin.title} on Modrinth`}
                    onClick={() => void openDetails(plugin)}
                  >
                    View on Modrinth ↗
                  </button>
                </div>
                <button
                  type="button"
                  className="outline install-plugin"
                  disabled={installing !== null}
                  onClick={() => void install(plugin)}
                >
                  {installing === plugin.projectId ? "Installing..." : "Install"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="plugin-browser-state">No compatible plugins found.</p>
        )}
        <p className="modrinth-credit">
          Downloads are provided by Modrinth. Restart a running server to load
          newly installed plugins.
        </p>
      </section>
    </div>
  );
}
