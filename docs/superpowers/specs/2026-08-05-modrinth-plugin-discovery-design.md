# Modrinth Plugin Discovery Enhancements

## Goal

Make the Paper plugin catalog easier to explore by linking each result to its full Modrinth page, making popularity sorting explicit, and searching automatically after the user pauses typing.

## User experience

Each Modrinth result keeps its existing icon, title, description, author, download count, and Install button. A distinct **View on Modrinth ↗** hyperlink appears beneath the author and download metadata. Activating it opens the project's plugin page in the user's default browser. The Install button remains independent and never opens the project page.

The search row gains a sort control with three options:

- **Popular** — sorts by download count and is the default for an empty catalog or a new session.
- **Relevance** — prioritizes matches to the current query.
- **Recently updated** — sorts by the latest project update.

Typing in search schedules a request after a 350 ms pause. Pressing Enter or selecting Search runs the current search immediately. An immediate search cancels the pending debounce timer, and results from an older request cannot replace newer results.

## Architecture

### Renderer

`PluginsTab` owns the query, selected sort, debounce timer, request sequence, loading state, and results. It passes the query and sort through the preload API. The renderer asks Electron to open a result's Modrinth page rather than navigating the Electron window directly.

The existing loading, empty, and error states remain. Changing sort triggers a new search using the current query. The sort control and search input remain usable while existing results are visible; the results are replaced only by the newest successful request.

### Electron bridge

The preload bridge extends the Modrinth search call with a sort value and exposes a narrowly scoped action for opening a Modrinth plugin page.

The main process validates the project slug using the same bounded Modrinth slug format used by the API layer. It constructs the URL itself as `https://modrinth.com/plugin/<encoded-slug>` and opens it through Electron's external-browser API. The renderer cannot supply an arbitrary URL.

### Modrinth API

The Modrinth search helper accepts one of `downloads`, `relevance`, or `updated` and passes it as the search endpoint's `index` parameter. Unsupported values are rejected before making a request. Compatibility facets for Paper, the server's Minecraft version, and server-side support remain unchanged.

## Error handling

- Failed searches continue to show the current catalog error without discarding a newer successful result.
- Stale responses are ignored through the existing request sequence guard.
- Unsafe or malformed project slugs are rejected in the main process and do not open a browser.
- Failure to open the external browser is surfaced through the existing catalog error area.

## Testing

Electron tests will verify each allowed sort maps to the correct Modrinth index and invalid sorts are rejected. They will also verify safe Modrinth project URLs are constructed while malformed slugs are blocked.

Renderer tests will use fake timers to verify the 350 ms debounce, immediate Enter/Search behavior, sort-triggered searches, and stale-response protection. They will verify the details link invokes the external-page bridge without invoking Install.

The full repository test suite, renderer build, Windows portable packaging, and visual QA will run before the pull request is handed back for review.

## Out of scope

This change does not add an in-app details flyout, pagination, plugin categories, update management, dependency installation, or changes to Fabric/Forge mod browsing.
