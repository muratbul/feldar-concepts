// Concept H, Then and now. Three parts: the dial in the hero plays once through the
// writing tools of five thousand years and lands on Feldar's page; the explorer shows
// one feature at a time with its capture; the typewriter closes the page. The demo on
// Feldar's page and the typewriter share the component's accept, revise and dismiss
// logic. Readers who ask for reduced motion start on Feldar's page, without autoplay.
import { runRibbonDemo, setUpTypewriter } from "../components/typewriter.js";

const AUTOPLAY_DELAY_MS = 700;
const AUTOPLAY_STEP_MS = 1150;
const EXPLORER_VISIBLE_SHARE = 0.25;
const LAST_ERA = "today";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function setUpDial(dial) {
    const frames = Array.from(dial.querySelectorAll("[data-era-frame]"));
    const stops = Array.from(dial.querySelectorAll("[data-era-stop]"));
    const stopsGroup = dial.querySelector("[data-era-stops]");
    const replay = dial.querySelector("[data-replay]");
    const eraStatus = dial.querySelector("[data-era-status]");
    let autoplayTimer;

    function showEra(era, { announce = false } = {}) {
        for (const frame of frames) {
            const isShown = frame.dataset.eraFrame === era;
            frame.classList.toggle("is-active", isShown);
            frame.inert = !isShown;
        }
        for (const stop of stops) {
            stop.setAttribute("aria-pressed", String(stop.dataset.eraStop === era));
        }
        if (!announce) return;
        const shownFrame = frames.find((frame) => frame.dataset.eraFrame === era);
        eraStatus.textContent = shownFrame.querySelector("[data-era-caption]").textContent;
    }

    function stopAutoplay() {
        clearTimeout(autoplayTimer);
        replay.hidden = false;
    }

    function playFrom(position) {
        showEra(frames[position].dataset.eraFrame);
        if (position === frames.length - 1) {
            stopAutoplay();
            return;
        }
        autoplayTimer = setTimeout(() => playFrom(position + 1), AUTOPLAY_STEP_MS);
    }

    function startAutoplay() {
        replay.hidden = true;
        clearTimeout(autoplayTimer);
        autoplayTimer = setTimeout(() => playFrom(0), AUTOPLAY_DELAY_MS);
    }

    stopsGroup.addEventListener("click", (event) => {
        const stop = event.target.closest("[data-era-stop]");
        if (!stop) return;
        stopAutoplay();
        showEra(stop.dataset.eraStop, { announce: true });
    });

    stopsGroup.addEventListener("keydown", (event) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (!step) return;
        const current = stops.indexOf(document.activeElement);
        const next = stops[(current + step + stops.length) % stops.length];
        event.preventDefault();
        stopAutoplay();
        next.focus();
        showEra(next.dataset.eraStop, { announce: true });
    });

    replay.addEventListener("click", startAutoplay);
    runRibbonDemo(dial.querySelector("[data-ink-demo]"));

    if (reducedMotion.matches) {
        showEra(LAST_ERA);
        return;
    }
    showEra(frames[0].dataset.eraFrame);
    startAutoplay();
}

function setUpExplorer(explorer) {
    const tabs = Array.from(explorer.querySelectorAll("[data-feature-tab]"));
    const panels = Array.from(explorer.querySelectorAll("[data-feature-panel]"));
    let isOnScreen = false;

    // Loops play only in the panel being shown, and only while the explorer is on
    // screen. Readers who ask for reduced motion get the poster and controls instead.
    function syncLoops() {
        for (const panel of panels) {
            const loop = panel.querySelector("video");
            if (!loop) continue;
            if (reducedMotion.matches) {
                loop.controls = true;
                continue;
            }
            if (!panel.hidden && isOnScreen) {
                loop.play().catch(() => undefined);
            } else {
                loop.pause();
            }
        }
    }

    function showFeature(feature) {
        for (const tab of tabs) {
            tab.setAttribute("aria-pressed", String(tab.dataset.featureTab === feature));
        }
        for (const panel of panels) {
            panel.hidden = panel.dataset.featurePanel !== feature;
        }
        syncLoops();
    }

    explorer.addEventListener("click", (event) => {
        const tab = event.target.closest("[data-feature-tab]");
        if (tab) showFeature(tab.dataset.featureTab);
    });

    new IntersectionObserver(
        ([entry]) => {
            isOnScreen = entry.isIntersecting;
            syncLoops();
        },
        { threshold: EXPLORER_VISIBLE_SHARE },
    ).observe(explorer);
}

setUpDial(document.querySelector("[data-dial]"));
setUpExplorer(document.querySelector("[data-explorer]"));
setUpTypewriter(document.querySelector("[data-machine]"), { typeIntro: "visible" });
