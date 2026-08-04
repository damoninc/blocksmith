# Centered Desktop Layout Design

## Goal

Center Blocksmith's primary content horizontally within the workspace to the right of the fixed sidebar. The application is desktop-only and does not need a mobile layout.

## Layout

- Keep the sidebar fixed at its existing 280px width.
- Make `main` the scrollable workspace and center a single inner content column within it.
- Constrain that content column to a maximum width of 850px while allowing it to shrink with the Electron window.
- Align page headers, action controls, tabs, forms, and cards to the same content column.
- Keep the welcome state horizontally and vertically centered within the available workspace.
- Remove the existing mobile media query and retain the Electron window's current minimum dimensions.

## Components

Add a shared renderer layout component that wraps each active view in the centered content column. Individual views remain responsible for their own content and behavior.

## Behavior and Data

This is a presentation-only change. Server state, IPC calls, navigation, forms, and error handling remain unchanged.

## Verification

- Run the TypeScript and Vite production build.
- Launch the production Electron entry point and confirm the welcome, create-server, and server-management views use the centered column.
- Confirm the sidebar remains fixed and the content remains usable at the existing minimum window size.
