// Site v2 prototype: the sample editor in the hero, kept at the app's proportions, Sage on
// the page under it, and the pieces of the app in the connected book section.
import { mountPieces } from "./app-pieces.js";
import { mountEditor } from "./editor-window.js";
import { initPlans } from "./plans.js";
import { initLineReveal } from "./reveal.js";
import { initSage } from "./sage.js";

const ICONS = new URL("../editor-hero/app-icons.svg", import.meta.url).href;
const SVG = "http://www.w3.org/2000/svg";

// Each thing to try in the hero: the app's icon for it and one line on what it does.
const TRIES = {
    plan: {
        icon: "scenes",
        text: "An empty chapter gets five scenes to edit, and Draft Page writes a first pass from them.",
    },
    continue: {
        icon: "scribble",
        text: "Feldar suggests the next lines at your caret. Accept them, revise them or dismiss them.",
    },
    rewrite: {
        icon: "define",
        text: "Select a passage and pick a rewrite from Polish, Deepen or Enhance. You see every change before it is kept.",
    },
    record: {
        icon: "file",
        text: "See how many words you typed and how many came from Feldar, kept privately for each book.",
    },
};

function appIcon(name) {
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("class", "app-icon");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(SVG, "use");
    use.setAttribute("href", `${ICONS}#${name}`);
    svg.append(use);
    return svg;
}

function span(className, ...content) {
    const element = document.createElement("span");
    element.className = className;
    element.append(...content);
    return element;
}

// The editor prototype draws its tries as plain tabs; here they take the page's mode panel.
function dressTries(stage) {
    const tablist = stage.querySelector(".eh-parts");
    tablist.classList.add("sv-modes");
    for (const tab of tablist.querySelectorAll(".eh-part")) {
        const { icon, text } = TRIES[tab.dataset.part];
        tab.className = "eh-part sv-mode";
        tab.replaceChildren(
            span("sv-mode-icon", appIcon(icon)),
            span("sv-mode-name", tab.textContent),
            span("sv-mode-text", text),
        );
    }
}

initSage(document.querySelector("[data-sage-stage]").closest("section"));
initLineReveal(document);
initPlans(document.querySelector("[data-plans]"));

const stage = document.querySelector("[data-editor-mount]");

await Promise.all([mountEditor(stage), mountPieces(document.querySelector(".sv-book"))]);

dressTries(stage);

const appWindow = stage.querySelector(".app");
const windowCell = document.createElement("div");
windowCell.className = "sv-window-cell";
appWindow.before(windowCell);
windowCell.append(appWindow);

const windowWidth = parseFloat(getComputedStyle(stage).getPropertyValue("--sv-window"));

// The window is zoomed to its column, as a screenshot would be, rather than reflowed into a
// layout the app does not have.
function fitWindow() {
    appWindow.style.zoom = String(Math.min(1, windowCell.clientWidth / windowWidth));
}

new ResizeObserver(fitWindow).observe(windowCell);
