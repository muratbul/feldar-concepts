// Mounts the sample editor from prototypes/editor-hero, so the window keeps one source of
// markup and behaviour. The stage's parts (things to try, the window, its foot) are copied
// into the holder with their relative links resolved from the source page.
import { initEditorHero } from "../editor-hero/editor-hero.js";

const SOURCE = new URL("../editor-hero/index.html", import.meta.url);
const LINK_ATTRIBUTES = ["src", "href"];

function rebaseLinks(root) {
    for (const element of root.querySelectorAll("[src], [href]")) {
        for (const name of LINK_ATTRIBUTES) {
            const link = element.getAttribute(name);
            if (link && !link.startsWith("#")) {
                element.setAttribute(name, new URL(link, SOURCE).href);
            }
        }
    }
}

export async function mountEditor(holder) {
    const response = await fetch(SOURCE);
    if (!response.ok) {
        throw new Error(`Could not load the sample editor from ${SOURCE}: ${response.status}`);
    }
    const source = new DOMParser().parseFromString(await response.text(), "text/html");
    const desk = source.querySelector("[data-editor-hero]");
    const stage = desk.querySelector(".eh-stage");
    rebaseLinks(stage);
    holder.dataset.part = desk.dataset.part;
    holder.append(...stage.children);
    initEditorHero(holder);
}
