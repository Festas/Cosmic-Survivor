// debugOverlay.js — Phase 1 (Core Architecture & Optimization)
//
// When the page URL contains `?rework=debug`, mounts a small fixed-position
// diagnostics panel (top-right, semi-transparent, monospace) over the canvas
// that shows live engine metrics.
//
// The overlay is a pure no-op when the query param is absent so it adds zero
// overhead in normal play. Every access to `window.rework` sub-systems is
// optional-chained so the overlay cannot throw even if those modules failed
// to load.

/**
 * Install the debug overlay if `?rework=debug` is present in the URL.
 * Safe to call unconditionally; returns immediately if the param is absent.
 */
export function installDebugOverlay() {
    // Feature-detect: only activate when ?rework=debug is in the URL.
    let isDebug = false;
    try {
        const params = new URLSearchParams(globalThis.location?.search ?? '');
        isDebug = params.get('rework') === 'debug';
    } catch {
        return;
    }
    if (!isDebug) return;

    // Wait for DOM before creating the panel.
    if (typeof document === 'undefined') return;

    const mount = () => {
        const panel = document.createElement('div');
        panel.id = 'rework-debug-overlay';
        panel.style.cssText = [
            'position:fixed',
            'top:8px',
            'right:8px',
            'z-index:99999',
            'background:rgba(0,0,0,0.75)',
            'color:#00ff88',
            'font:12px/1.5 monospace',
            'padding:8px 12px',
            'border-radius:6px',
            'min-width:200px',
            'pointer-events:none',
            'white-space:pre',
            'border:1px solid rgba(0,255,136,0.3)',
        ].join(';');
        document.body.appendChild(panel);

        // FPS — rolling 60-frame average
        const FPS_WINDOW = 60;
        const frameTimes = new Float64Array(FPS_WINDOW);
        let frameIdx = 0;
        let lastTime = performance.now();
        let fps = 0;

        function updateFps(now) {
            const dt = now - lastTime;
            lastTime = now;
            frameTimes[frameIdx % FPS_WINDOW] = dt;
            frameIdx++;
            if (frameIdx >= FPS_WINDOW) {
                let sum = 0;
                for (let i = 0; i < FPS_WINDOW; i++) sum += frameTimes[i];
                fps = Math.round((FPS_WINDOW / (sum / 1000)) * 10) / 10;
            }
        }

        function renderPanel() {
            const rw = globalThis.window?.rework;

            // FPS
            const fpsLine = `FPS: ${fps || '…'}`;

            // Stance
            let stanceLine = 'Stance: N/A';
            try {
                const stance = rw?.stance?.stance ?? rw?.stance?.getStance?.();
                if (stance != null) stanceLine = `Stance: ${stance}`;
            } catch { /* ignore */ }

            // Weather
            let weatherLine = 'Weather: N/A';
            try {
                const wid = rw?.weather?.current?.id ?? rw?.weather?.getCurrent?.()?.id;
                if (wid != null) weatherLine = `Weather: ${wid}`;
            } catch { /* ignore */ }

            // RNG seed
            let rngLine = 'RNG seed: N/A';
            try {
                const seed = rw?.rng?.seed ?? rw?.rng?.currentSeed;
                if (seed != null) rngLine = `RNG seed: ${seed}`;
            } catch { /* ignore */ }

            // Pool stats
            let poolLines = '';
            try {
                const pools = rw?.listPools?.();
                if (pools && pools.length > 0) {
                    poolLines = '\n─ pools ─\n' + pools
                        .map(p => `${p.name}: ${p.inUse}/${p.cap} (${p.exhaustEvents}⚡)`)
                        .join('\n');
                }
            } catch { /* ignore */ }

            // Part D — broadphase telemetry
            let bpLines = '';
            try {
                const bp = rw?.broadphase;
                if (bp) {
                    bpLines = '\n─ broadphase ─\n';
                    bpLines += `kind: ${bp.kind}\n`;
                    bpLines += `build: ${bp.lastBuildMs.toFixed(2)}ms\n`;
                    bpLines += `query: ${bp.lastQueryMs.toFixed(2)}ms  candidates: ${bp.lastQueryCount}`;
                    if (bp.kind === 'worker') {
                        bpLines += `\nroundtrip: ${bp.roundtripMs.toFixed(1)}ms`;
                        bpLines += `  pending: ${bp.pendingQueries}`;
                        bpLines += `  stale: ${bp.staleResults}`;
                    }
                }
            } catch { /* ignore */ }

            // Part E — clock telemetry
            let clockLines = '';
            try {
                const clk = rw?.clock;
                if (clk) {
                    clockLines = '\n─ clock ─\n';
                    clockLines += `mode: ${clk.mode}\n`;
                    if (clk.fixedStepEnabled) {
                        clockLines += `simHz: ${clk.simHz}  steps/frame: ${clk.simTicksThisFrame}\n`;
                        clockLines += `alpha: ${clk.lastAlpha.toFixed(3)}  interp: ${clk.interpEnabled}`;
                    }
                }
            } catch { /* ignore */ }

            panel.textContent = [fpsLine, stanceLine, weatherLine, rngLine].join('\n') + poolLines + bpLines + clockLines;
        }

        function loop(now) {
            updateFps(now);
            renderPanel();
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
}
