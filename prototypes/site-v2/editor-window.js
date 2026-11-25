// Mounts the sample editor: the stage's parts (things to try, the window, its foot) from
// prototypes/editor-hero, run by that prototype's own script.
import { initEditorHero } from "../editor-hero/editor-hero.js";
import { loadAppSource, takePart } from "./app-source.js";

export async function mountEditor(holder) {
    const desk = takePart(await loadAppSource(), "[data-editor-hero]");
    holder.dataset.part = desk.dataset.part;
    holder.append(...desk.querySelector(".eh-stage").children);
    initEditorHero(holder);
}
