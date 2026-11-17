// Concept E, Clay. Five small behaviours: the menu on narrow screens, the hero tablet
// that takes the visitor's first line, the seal that rolls the frieze in, the wet clay
// and fired clay demo, and loops that play only while they are on screen. All copy
// lives in the markup; this file only moves state.
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const menuButton = document.querySelector("[data-menu]");
const menuLinks = document.getElementById("cl-links");

menuButton.addEventListener("click", () => {
    const isOpen = menuLinks.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
});

const tabletInput = document.querySelector("[data-tablet-input]");
const tabletLine = document.querySelector("[data-tablet-line]");
const tabletWedges = document.querySelectorAll("[data-tablet-wedges] .cl-wedge");
let pressedLine = tabletInput.value;

// Letters added to the end of the line are pressed in one by one; any other edit
// smooths the tablet and presses the whole line again.
function pressLine() {
    const line = tabletInput.value;

    if (line.startsWith(pressedLine)) {
        const freshLetters = document.createElement("span");
        freshLetters.className = "is-new";
        freshLetters.textContent = line.slice(pressedLine.length);
        tabletLine.replaceChildren(pressedLine, freshLetters);
    } else {
        tabletLine.textContent = line;
    }
    pressedLine = line;

    const pressedCount = Math.ceil((line.length / tabletInput.maxLength) * tabletWedges.length);
    tabletWedges.forEach((wedge, position) => {
        wedge.classList.toggle("is-pressed", position < pressedCount);
    });
}

tabletInput.addEventListener("input", pressLine);
pressLine();

const frieze = document.querySelector("[data-frieze]");

if (!reducedMotion.matches) {
    frieze.classList.add("is-waiting");
    const friezeOnScreen = new IntersectionObserver(
        ([entry]) => {
            if (!entry.isIntersecting) return;
            frieze.classList.replace("is-waiting", "is-rolling");
            friezeOnScreen.disconnect();
        },
        { threshold: 0.6 },
    );
    friezeOnScreen.observe(frieze);
}

const demo = document.querySelector("[data-demo]");
const suggestions = Array.from(demo.querySelectorAll("[data-demo-suggestion]"));
const reviewControls = demo.querySelector("[data-demo-review]");
const idleControls = demo.querySelector("[data-demo-idle]");
const continueButton = demo.querySelector('[data-demo-action="continue"]');
const restartButton = demo.querySelector('[data-demo-action="restart"]');
const demoStatus = demo.querySelector("[data-demo-status]");
let currentIndex = 0;

function showNextTake(suggestion) {
    const takes = Array.from(suggestion.querySelectorAll("[data-demo-take]"));
    const shownIndex = takes.findIndex((take) => !take.hidden);
    takes[shownIndex].hidden = true;
    takes[(shownIndex + 1) % takes.length].hidden = false;
}

function offerNext(message) {
    const isFinished = currentIndex === suggestions.length;
    reviewControls.hidden = true;
    idleControls.hidden = false;
    continueButton.hidden = isFinished;
    restartButton.hidden = !isFinished;
    demoStatus.textContent = message;
    (isFinished ? restartButton : continueButton).focus();
}

function suggest() {
    suggestions[currentIndex].hidden = false;
    idleControls.hidden = true;
    reviewControls.hidden = false;
    demoStatus.textContent = "";
    reviewControls.querySelector("button").focus();
}

// The wipe lasts as long as the stylesheet says (no time at all under reduced motion).
// A timer ends it, because animation events do not fire while a tab is in the background.
function wipe(suggestion) {
    reviewControls.hidden = true;
    suggestion.classList.add("is-wiping");
    const wipeSeconds = Number.parseFloat(getComputedStyle(suggestion).animationDuration);

    setTimeout(() => {
        suggestion.classList.remove("is-wiping");
        suggestion.hidden = true;
        offerNext(demoStatus.dataset.wiped);
    }, wipeSeconds * 1000);
}

const demoActions = {
    accept() {
        suggestions[currentIndex].classList.add("is-fired");
        currentIndex += 1;
        offerNext(demoStatus.dataset.fired);
    },
    revise() {
        showNextTake(suggestions[currentIndex]);
        demoStatus.textContent = demoStatus.dataset.smoothed;
    },
    dismiss() {
        wipe(suggestions[currentIndex]);
    },
    continue: suggest,
    restart() {
        for (const suggestion of suggestions) {
            suggestion.classList.remove("is-fired");
            suggestion.hidden = true;
        }
        currentIndex = 0;
        suggest();
    },
};

demo.addEventListener("click", (event) => {
    const button = event.target.closest("[data-demo-action]");
    if (button) demoActions[button.dataset.demoAction]();
});

if (!reducedMotion.matches) {
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
