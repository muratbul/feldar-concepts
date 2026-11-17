// Concept G, Typewriter. The hero machine is the shared typewriter component, typing
// its headline on load; the plainer demo further down runs the same accept, revise and
// dismiss logic without a machine.
import { runRibbonDemo, setUpTypewriter } from "../components/typewriter.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Loops play only while on screen. Readers who ask for reduced motion get the poster
// frame and the browser's own controls instead.
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
        { threshold: 0.4 },
    );
    for (const loop of loops) onScreen.observe(loop);
}

setUpTypewriter(document.querySelector("[data-machine]"), { typeIntro: "load" });
runRibbonDemo(document.querySelector("[data-page-demo]"));
playLoopsOnScreen(document.querySelectorAll("video[data-loop]"));
