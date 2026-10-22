# Deck's desktop application

Electron with a TypeScript renderer, no framework and no bundler.

- `npm install`, then `npm start` builds and opens Deck.
- `npm test` builds and runs every node suite; `bash ../tools/scripts/run-desktop-tests.sh <suite>` runs one.
- `bash ../tools/scripts/run-smoke.sh both` runs the window checks in a Linux container, and `bash ../tools/scripts/walk-in-a-box.sh <walk>` runs one scripted walk there. Neither opens a window on this screen.

## Shells and node-pty

The shell drawer (FEAT-0035) runs its terminals through `node-pty` 1.1.0, an optional dependency pinned exactly.

- **macOS and Windows** use the binaries node-pty ships. They are built on Node-API, so the same file loads in plain node and in Electron, and an Electron upgrade needs no rebuild.
- **Linux** has no shipped binary, so `npm install` compiles one, which needs `make`, `g++` and Python. The container image (`tools/docker/smoke.Dockerfile`) has them.
- **After every install**, `scripts/pty-helper.mjs` runs as `postinstall`. node-pty ships its macOS `spawn-helper` without the execute bit, and without it every shell fails with "posix_spawnp failed".

When node-pty did not install, `npm install` still succeeds, because the dependency is optional. Deck then says shells are off and the drawer offers none. To fix it:

1. Install the compiler: `xcode-select --install` on macOS, `build-essential` on Debian or Ubuntu.
2. Run `npm install` again in `desktop/`.
3. If shells fail with "posix_spawnp failed", run `node scripts/pty-helper.mjs`.
