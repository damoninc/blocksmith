# Server Rename and Delete Design

## Goal

Let users rename or permanently delete a local Minecraft server without exposing server folders to accidental path changes or deletion mistakes.

## Rename Behavior

Rename changes only the server's displayed name in `.blocksmith.json`. The stable server ID and folder name remain unchanged so scripts, paths, mods, and existing configuration continue to work.

The server header will expose a Rename action that opens an in-app dialog prefilled with the current name. Names are trimmed, must be non-empty, and are written by Electron. A successful rename returns refreshed server details so the header and sorted sidebar update immediately. Filesystem failures remain visible inside the dialog.

## Delete Behavior

The server header will expose a Delete action that opens a destructive confirmation dialog. The dialog explains that deletion removes the complete server folder and cannot be undone. To enable confirmation, the user must type the server's exact current display name with matching case.

Deletion is unavailable while that server is running. Electron also rejects deletion if its process map says the server is running, so renderer state cannot bypass the safeguard. After confirmation, Electron validates the supplied name against `.blocksmith.json`, removes only that server's resolved folder, and returns success. The renderer removes it from the list and selects the first remaining sorted server. If no servers remain, it returns to the welcome view.

## Boundaries and Safety

- React owns dialog visibility, form state, inline validation, and post-operation selection.
- The preload bridge exposes typed rename and delete operations.
- Electron owns metadata writes, process-state checks, exact-name confirmation, path containment validation, and folder removal.
- Rename does not alter `server.properties`, the server folder, or the server ID.
- Delete resolves the target beneath the configured server root and rejects any target that escapes that root.

## Error Handling

- Empty rename values are rejected before saving and by Electron.
- Rename write failures keep the dialog open with an inline message.
- Incorrect delete confirmation leaves the destructive button disabled.
- Running servers cannot be deleted, even if the IPC operation is invoked directly.
- Missing metadata, missing folders, and filesystem failures are reported inline without optimistically changing the renderer list.

## Verification

- Unit tests cover trimmed rename persistence, stable folder/ID behavior, exact delete confirmation, running-server rejection, path containment, and complete folder removal.
- Renderer regression tests cover the two actions, dialog fields, disabled delete confirmation, and selection after deletion.
- Existing tests, TypeScript checks, production build, Electron smoke launch, and Windows portable packaging remain successful.
