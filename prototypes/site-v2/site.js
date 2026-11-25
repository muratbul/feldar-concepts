// Site v2 prototype: the sample editor in the hero, kept at the app's proportions, and
// Sage on the page under it.
import { mountEditor } from "./editor-window.js";
import { initSage } from "./sage.js";

initSage(document.querySelector("[data-sage-stage]").closest("section"));

const stage = document.querySelector("[data-editor-mount]");

await mountEditor(stage);

const appWindow = stage.querySelector(".app");
const windowWidth = parseFloat(getComputedStyle(stage).getPropertyValue("--sv-window"));

// Below the window's own width the window is zoomed down, as a screenshot would be,
// rather than reflowing the app into a layout it does not have. The things to try and
// the status line around it stay at reading size.
function fitWindow() {
    appWindow.style.zoom = String(Math.min(1, stage.clientWidth / windowWidth));
}

new ResizeObserver(fitWindow).observe(stage);
