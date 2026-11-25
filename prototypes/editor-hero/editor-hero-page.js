// This prototype's own page: the sample editor on its handwritten desk.
import { initEditorHero } from "./editor-hero.js";
import { paintInkGround } from "./ink-ground.js";

const editorHero = document.querySelector("[data-editor-hero]");

initEditorHero(editorHero);
paintInkGround(editorHero.querySelector("[data-ink-ground]"), editorHero.querySelector("[data-ink-clear]"));
