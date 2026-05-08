// Wires F11 to toggle fullscreen when running inside Tauri.
// Web/PWA users get nothing here (browsers handle F11 natively).
export function installTauriFullscreenToggle(): void {
    // Tauri v2 exposes window.__TAURI_INTERNALS__ at runtime.
    // In a browser or Node test environment this property is absent, so we bail out immediately.
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) return;

    window.addEventListener('keydown', async (e) => {
        if (e.key !== 'F11') return;
        e.preventDefault();
        // Dynamic import keeps this module out of the web bundle's synchronous
        // entry chunk — Vite code-splits it so browser users never load it.
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        const isFs = await win.isFullscreen();
        await win.setFullscreen(!isFs);
    });
}
