// Concept A, Manuscript. Two behaviours: each margin note and the passage it describes
// light up together, and the plates that are loops play only while they are on screen.
const spread = document.querySelector("[data-spread]");
const loops = document.querySelectorAll("video[data-loop]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function markNote(noteNumber) {
    for (const element of spread.querySelectorAll("[data-note]")) {
        element.classList.toggle("is-active", element.dataset.note === noteNumber);
    }
}

function markNoteUnder(event) {
    markNote(event.target.closest("[data-note]")?.dataset.note);
}

spread.addEventListener("pointerover", markNoteUnder);
spread.addEventListener("focusin", markNoteUnder);
spread.addEventListener("pointerleave", () => markNote());
spread.addEventListener("focusout", () => markNote());

if (!reducedMotion.matches) {
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
