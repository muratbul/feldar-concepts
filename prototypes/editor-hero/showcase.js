// The sections under the editor. A band lists its part's tools and shows the open one in
// the app beside the list. A link to try a tool opens it in the working sample at the top
// of the page. Without this script every row's text shows and the stage keeps its first
// piece, and a link to try a tool goes to the sample.

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function initIndex(index) {
    const toggles = [...index.querySelectorAll(".sc-row-toggle")];

    // One row is always open, so the stage always has a piece of the app to show.
    function open(chosen) {
        for (const toggle of toggles) {
            const isChosen = toggle === chosen;
            toggle.setAttribute("aria-expanded", String(isChosen));
            document.getElementById(toggle.getAttribute("aria-controls")).hidden = !isChosen;
            document.getElementById(toggle.dataset.shows).hidden = !isChosen;
        }
    }

    for (const toggle of toggles) toggle.addEventListener("click", () => open(toggle));
    open(toggles.find((toggle) => toggle.getAttribute("aria-expanded") === "true") ?? toggles[0]);
}

function initTryLinks(desk) {
    for (const link of document.querySelectorAll("a[data-try]")) {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            const tab = desk.querySelector(`.eh-part[data-part="${link.dataset.try}"]`);
            tab.click();
            desk.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
            tab.focus({ preventScroll: true });
        });
    }
}

for (const index of document.querySelectorAll("[data-index]")) initIndex(index);

const desk = document.querySelector("[data-editor-hero]");
if (desk) initTryLinks(desk);
