# src-tauri — Tauri Native Shell

This directory contains the Rust crate that wraps Cosmic Survivor's PWA in a
native desktop window via [Tauri v2](https://v2.tauri.app/).

---

## Configuration notes

### Dev server port

`tauri.conf.json` uses `devUrl: "http://localhost:3000"` because the Vite dev
server in this project is configured to port **3000** (`vite.config.js`,
`server.port: 3000`). If you change the Vite port, update `devUrl` to match.

### Content Security Policy

The CSP in `tauri.conf.json` → `app.security.csp` is set as follows:

| Directive | Value | Reason |
|---|---|---|
| `default-src` | `'self'` | Deny-by-default; only explicitly listed sources are allowed |
| `connect-src` | `'self' wss://* ws://localhost:* http://localhost:*` | Multiplayer WebSocket connects to a runtime-configurable server (`wss://` in production, `ws://localhost` in dev per PR #23/#28) |
| `img-src` | `'self' data: blob:` | PWA icon assets use `data:` URLs; particle textures may use `blob:` canvas exports |
| `script-src` | `'self' 'wasm-unsafe-eval'` | PixiJS uses WebAssembly shader compilation paths that require `wasm-unsafe-eval`; `'unsafe-eval'` is **not** included |
| `style-src` | `'self' 'unsafe-inline'` | The game injects inline `style=` attributes in several HUD and UI elements; removing this would require a large refactor |

`'wasm-unsafe-eval'` is narrower than `'unsafe-eval'` — it only allows
WebAssembly modules, not arbitrary `eval()` strings. This limits the exploit
surface while still permitting PixiJS shader compilation.

---

## Capabilities — minimal by default

`capabilities/default.json` grants only `core:default` to the main window.
This is intentionally minimal: the game runs as a wrapped PWA and does not
need filesystem, shell, dialog, HTTP, or any other OS-level plugin access.

**If a future feature requires OS access**, extend `capabilities/default.json`
at that time. Examples:

| Feature | Permission to add |
|---|---|
| Save / load file dialogs | `dialog:open`, `dialog:save` |
| System tray | `tray-icon:*` |
| Auto-updater | `updater:*` |
| Desktop notifications | `notification:default` |

Adding permissions without a concrete feature that requires them violates the
principle of least privilege and opens attack surface.

---

## Icon regeneration

Icons in `icons/` were generated from `public/icon-512.svg`:

```bash
npm run tauri:icon public/icon-512.svg
```

Re-run this command whenever the source icon changes. The generated files are
committed so CI does not need Tauri CLI to be installed separately.

---

## Code signing (unsigned binaries)

The current release pipeline (`tauri-release.yml`) does **not** sign binaries.

- **Windows**: SmartScreen will warn on first launch. Users can click
  "More info → Run anyway". Resolved by purchasing an EV code-signing
  certificate and adding it as a repo secret.
- **macOS**: Gatekeeper will block unsigned `.app` bundles. Users can
  right-click → Open to bypass. Resolved by enrolling in the Apple Developer
  Programme, adding your certificate and notarisation credentials as repo
  secrets, and extending the workflow with `apple-actions/import-codesign-certs`
  and `notarytool`.

Signed releases are a follow-up task; unsigned binaries are acceptable for an
open-source game's initial native packaging.

---

## Local development

```bash
# Prerequisites: rustup (https://rustup.rs/)

npm install
npm run tauri:dev    # starts Vite dev server + Tauri dev window with hot reload
npm run tauri:build  # produces installers in src-tauri/target/release/bundle/
```
