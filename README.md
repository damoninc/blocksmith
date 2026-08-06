# Blocksmith

Blocksmith is a local-first Electron app for creating and operating Minecraft Java Edition servers. Choose a server folder, create Vanilla, Paper, Fabric, or Forge instances, edit `server.properties`, and add mods without leaving the desktop app.

## Requirements

- Windows 10/11
- Java 21 or later on your `PATH` (needed by modern Minecraft server versions)

## Development

```powershell
npm install
npm start
```

## Packaging

```powershell
npm run package:win
```

The portable Windows executable will be written to `dist/`.

## Contributions and releases

Pull request titles and commits must follow [Conventional Commits](https://www.conventionalcommits.org/). Use `fix:` for a patch release, `feat:` for a minor release, and `!` or a `BREAKING CHANGE:` footer for a major release. Types such as `docs:`, `test:`, `chore:`, and `ci:` pass validation but do not create a release by themselves.

Pull requests run the full test suite and a Windows packaging check. After a releasable change reaches `main`, semantic-release calculates the next version, creates the matching GitHub tag and release notes, and attaches the versioned portable Windows executable to the GitHub Release.

## Notes

- Forge's official installer is downloaded and run locally to install a server.
- You must accept Mojang's EULA before a server can be started; Blocksmith has a dedicated control for it.
