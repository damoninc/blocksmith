# Server Management UI Improvements Design

## Goal

Make server selection, configuration, EULA handling, startup, and connection details feel like one coherent desktop workflow while keeping Minecraft's own files as the source of truth.

## Server Details Model

Electron will expose a unified server-details response containing:

- Existing Blocksmith metadata.
- Parsed `server.properties` values.
- The complete raw properties document needed to preserve unknown keys and comments.
- EULA acceptance read from `eula.txt`.
- A display address derived from `server-ip` and `server-port`.

No property or EULA value will be copied into `.blocksmith.json`. `server.properties` and `eula.txt` remain authoritative.

## Initial Selection

After loading a server folder, the renderer selects the first sorted server when no server is selected. A current valid selection is retained across refreshes. If the selected server disappears, the first remaining server is selected.

## Properties Form

The Properties tab will replace the primary raw textarea with typed controls for:

- MOTD
- Server IP
- Server port
- Maximum players
- Game mode
- Difficulty
- Online mode
- PvP
- Allow flight
- Whitelist
- View distance
- Simulation distance
- Spawn protection

An Advanced section will expose the remaining raw properties so uncommon settings stay editable. Saving merges common fields and advanced entries into the existing document, preserving unknown keys and comments where possible. Numeric inputs will use appropriate minimum and maximum constraints, and boolean settings will use checkboxes or selects.

## Sidebar Address

Each server row will show `server-ip:server-port` only when `server-ip` is non-empty. If `server-ip` is blank, no address line is shown. The displayed value always comes from `server.properties`.

## EULA State

Selecting a server reads `eula.txt`. Before acceptance, the Overview tab shows the existing acceptance action. After acceptance, it shows a disabled green `✓ Accepted` control. Accepting updates `eula.txt` and the renderer state immediately.

## Java Resolution and Startup

Windows error `-4058` is caused by `java` not being available on this machine's `PATH`. Startup will resolve Java in this order:

1. A previously saved Java executable path.
2. `java` available through `PATH`.
3. Common Windows Java installation directories.
4. A native file picker asking the user to select `java.exe`.

The selected executable is validated, saved in Blocksmith settings, and reused. If selection is cancelled or invalid, startup fails with a clear console message. Forge startup continues to use its generated run script, which is responsible for invoking Java according to Forge's installation layout.

Clicking Start immediately switches to the Console tab and displays startup output. Spawn errors and non-zero exits remain visible in the console instead of appearing only as transient notifications.

## Components and Boundaries

- Electron owns filesystem parsing, property merging, EULA reads and writes, Java discovery, executable selection, and process startup.
- The preload bridge exposes typed operations and server process events.
- The renderer owns selection, form state, tab navigation, status presentation, and field validation feedback.
- Focused utility modules handle property parsing/serialization, connection-address formatting, and Java candidate resolution so they can be tested without launching Electron.

## Error Handling

- Missing or malformed property files fall back to Minecraft defaults while preserving readable content.
- Invalid numeric form values prevent saving and identify the affected field.
- Java lookup cancellation or failure produces a clear Console entry and leaves the server offline.
- Process spawn and exit errors include the executable or command attempted and the operating-system error.
- Property and EULA write failures remain visible and do not optimistically report success.

## Verification

- Unit tests cover property parsing and merging, address formatting, Java candidate resolution, and EULA parsing.
- Renderer regression tests cover first-server selection, accepted-EULA presentation, properties fields, and automatic Console navigation.
- Existing renderer and server-creation tests remain green.
- The TypeScript/Vite production build succeeds.
- An Electron smoke test validates auto-selection, properties presentation, EULA state, Console navigation, and Java selection behavior.
