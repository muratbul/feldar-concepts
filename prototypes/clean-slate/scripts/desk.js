// Concept J, The writer's desk. Every object on the desk and every entry in the index
// below it chooses a feature; the chosen feature's panel shows and its object stays
// lit. The typewriter is the shared component and types its intro when it comes into
// view. Loops play only while on screen, and never for readers who ask for reduced
// motion.
import { setUpTypewriter } from "../components/typewriter.js";

const LOOP_VISIBLE_SHARE = 0.4;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const choosers = document.querySelectorAll("[data-feature]");
const panels = document.querySelectorAll("[data-panel]");

function choose(feature) {
    for (const chooser of choosers) {
        chooser.setAttribute("aria-pressed", String(chooser.dataset.feature === feature));
    }

    let chosenPanel;
    for (const panel of panels) {
        panel.hidden = panel.dataset.panel !== feature;
        if (!panel.hidden) chosenPanel = panel;
    }

    chosenPanel.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "nearest" });
}

function playLoopsOnScreen(loops) {
    if (reducedMotion.matches) {
        for (const loop of loops) loop.controls = true;
        return;
    }

    const onScreen = new IntersectionObserver(
        (entries) => {
            for (const { target: loop, isIntersecting } of entries) {
                if (isIntersecting) {
                    loop.play().catch(() => undefined);
                } else {
                    loop.pause();
                }
            }
        },
        { threshold: LOOP_VISIBLE_SHARE },
    );
    for (const loop of loops) onScreen.observe(loop);
}

function setUpMenu(bar) {
    const menuButton = bar.querySelector("[data-menu-button]");

    function setOpen(isOpen) {
        bar.classList.toggle("is-open", isOpen);
        menuButton.setAttribute("aria-expanded", String(isOpen));
    }

    menuButton.addEventListener("click", () => setOpen(!bar.classList.contains("is-open")));
    bar.addEventListener("keydown", (event) => {
        if (event.key === "Escape") setOpen(false);
    });
}

document.addEventListener("click", (event) => {
    const chooser = event.target.closest("[data-feature]");
    if (chooser) choose(chooser.dataset.feature);
});

setUpTypewriter(document.querySelector("[data-machine]"), { typeIntro: "visible" });
playLoopsOnScreen(document.querySelectorAll("video[data-loop]"));
setUpMenu(document.querySelector("[data-bar]"));
