// Concept D, 5,000 years. Plays each era's artwork as it scrolls into view, keeps the
// era rail in step with the page, plays the app loop only while it is on screen, and
// runs the accept / revise / dismiss demo on the last page of the line. Without this
// script, or for readers who ask for reduced motion, every artwork shows its end state.
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const MIDDLE_OF_SCREEN = { rootMargin: "-50% 0px -50% 0px" };

function onceInView(elements, handle, threshold) {
    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                handle(entry.target);
                observer.unobserve(entry.target);
            }
        },
        { threshold },
    );
    for (const element of elements) observer.observe(element);
}

if (!reducedMotion.matches) {
    document.documentElement.classList.add("fy-motion");
    onceInView(
        document.querySelectorAll("[data-reveal]"),
        (artwork) => artwork.classList.add("is-inview"),
        0.45,
    );

    const loopOnScreen = new IntersectionObserver(
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
    for (const loop of document.querySelectorAll("video[data-loop]")) loopOnScreen.observe(loop);
}

const bar = document.querySelector("[data-bar]");
const darkErasUnderBar = new Set();

const underBar = new IntersectionObserver(
    (entries) => {
        for (const { target: era, isIntersecting } of entries) {
            if (isIntersecting) {
                darkErasUnderBar.add(era);
            } else {
                darkErasUnderBar.delete(era);
            }
        }
        bar.classList.toggle("is-on-dark", darkErasUnderBar.size > 0);
    },
    { rootMargin: "-32px 0px -95% 0px" },
);
for (const era of document.querySelectorAll('[data-tone="dark"]')) underBar.observe(era);

const rail = document.querySelector("[data-rail]");

new IntersectionObserver(([eras]) => {
    rail.classList.toggle("is-visible", eras.isIntersecting);
}, MIDDLE_OF_SCREEN).observe(document.querySelector("[data-eras]"));

const eraOnScreen = new IntersectionObserver((entries) => {
    const crossing = entries.find((entry) => entry.isIntersecting);
    if (!crossing) return;

    for (const link of rail.querySelectorAll("[data-rail-link]")) {
        if (link.dataset.railLink === crossing.target.dataset.era) {
            link.setAttribute("aria-current", "true");
        } else {
            link.removeAttribute("aria-current");
        }
    }
}, MIDDLE_OF_SCREEN);
for (const era of document.querySelectorAll("[data-era]")) eraOnScreen.observe(era);

const demo = document.querySelector("[data-ink-demo]");
const continuation = demo.querySelector("[data-ink-continuation]");
const reviewActions = demo.querySelector("[data-ink-review]");
const idleActions = demo.querySelector("[data-ink-idle]");
const demoStatus = demo.querySelector("[data-ink-status]");

function showNextVariant() {
    const variants = Array.from(continuation.querySelectorAll("[data-ink-variant]"));
    const visibleIndex = variants.findIndex((variant) => !variant.hidden);
    variants[visibleIndex].hidden = true;
    variants[(visibleIndex + 1) % variants.length].hidden = false;
}

function rest(outcome) {
    reviewActions.hidden = true;
    idleActions.hidden = false;
    for (const button of idleActions.querySelectorAll("[data-ink-after]")) {
        button.hidden = button.dataset.inkAfter !== outcome;
    }
    demoStatus.textContent = demoStatus.dataset[outcome];
}

const inkActions = {
    accept() {
        continuation.classList.add("is-accepted");
        rest("accepted");
    },
    revise: showNextVariant,
    dismiss() {
        continuation.hidden = true;
        rest("dismissed");
    },
    suggest() {
        continuation.classList.remove("is-accepted");
        continuation.hidden = false;
        showNextVariant();
        idleActions.hidden = true;
        reviewActions.hidden = false;
        demoStatus.textContent = "";
    },
};

demo.addEventListener("click", (event) => {
    const button = event.target.closest("[data-ink-action]");
    if (button) inkActions[button.dataset.inkAction]();
});
