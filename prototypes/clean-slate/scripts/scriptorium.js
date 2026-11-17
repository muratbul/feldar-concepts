// Concept F, Scriptorium. The page works as plain reading without this module; it adds
// the light on the gold, the creatures' moods, the blue-ink demo, the readers in the
// margin, the Checks mark, the loop playback and the cat. Every word shown lives in
// the markup: this only changes what is visible.
const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(pointer: fine)");

function letGoldFollowThePointer() {
    if (reducedMotion.matches || !finePointer.matches) return;

    let pendingFrame = 0;
    window.addEventListener(
        "pointermove",
        (event) => {
            if (pendingFrame) return;
            pendingFrame = requestAnimationFrame(() => {
                root.style.setProperty("--sc-light-x", `${event.clientX}px`);
                root.style.setProperty("--sc-light-y", `${event.clientY}px`);
                pendingFrame = 0;
            });
        },
        { passive: true },
    );
}

function setUpMenu() {
    const menuButton = document.querySelector("[data-menu-button]");
    const menu = document.querySelector("[data-menu]");

    menuButton.addEventListener("click", () => {
        const isOpen = menu.classList.toggle("is-open");
        menuButton.setAttribute("aria-expanded", String(isOpen));
    });
}

// Hover and focus rouse a creature through CSS; a press keeps it roused, for touch.
function setUpCreatures() {
    for (const creature of document.querySelectorAll("[data-creature]")) {
        creature.addEventListener("click", () => {
            const isRoused = creature.getAttribute("aria-pressed") === "true";
            creature.setAttribute("aria-pressed", String(!isRoused));
        });
    }
}

function setUpInkDemo() {
    const demo = document.querySelector("[data-ink-demo]");
    const suggestions = Array.from(demo.querySelectorAll("[data-suggestion]"));
    const reviewChoices = demo.querySelector("[data-review]");
    const idleChoices = demo.querySelector("[data-idle]");
    const continueButton = demo.querySelector('[data-ink="continue"]');
    const restartButton = demo.querySelector('[data-ink="restart"]');
    const status = demo.querySelector("[data-status]");
    let currentIndex = 0;

    function showNextTake(suggestion) {
        const takes = Array.from(suggestion.querySelectorAll("[data-take]"));
        const shownIndex = takes.findIndex((take) => !take.hidden);
        takes[shownIndex].hidden = true;
        takes[(shownIndex + 1) % takes.length].hidden = false;
    }

    function rest(message) {
        const isFinished = currentIndex === suggestions.length;
        reviewChoices.hidden = true;
        idleChoices.hidden = false;
        continueButton.hidden = isFinished;
        restartButton.hidden = !isFinished;
        status.textContent = message;
        (isFinished ? restartButton : continueButton).focus();
    }

    function suggest() {
        suggestions[currentIndex].hidden = false;
        idleChoices.hidden = true;
        reviewChoices.hidden = false;
        status.textContent = "";
        reviewChoices.querySelector("button").focus();
    }

    const actions = {
        accept() {
            suggestions[currentIndex].classList.add("is-accepted");
            currentIndex += 1;
            rest(status.dataset.accepted);
        },
        revise() {
            showNextTake(suggestions[currentIndex]);
            status.textContent = status.dataset.revised;
        },
        dismiss() {
            suggestions[currentIndex].hidden = true;
            rest(status.dataset.dismissed);
        },
        continue: suggest,
        restart() {
            for (const suggestion of suggestions) {
                suggestion.classList.remove("is-accepted");
                suggestion.hidden = true;
            }
            currentIndex = 0;
            suggest();
        },
    };

    demo.addEventListener("click", (event) => {
        const button = event.target.closest("[data-ink]");
        if (button) actions[button.dataset.ink]();
    });
}

function setUpReaders() {
    const readers = document.querySelector("[data-readers]");
    const readerName = document.querySelector("[data-reader-name]");
    const glosses = document.querySelectorAll("[data-gloss]");

    readers.addEventListener("click", (event) => {
        const chosen = event.target.closest("[data-reader]");
        if (!chosen) return;

        for (const roundel of readers.querySelectorAll("[data-reader]")) {
            roundel.setAttribute("aria-pressed", String(roundel === chosen));
        }
        for (const gloss of glosses) {
            gloss.hidden = gloss.dataset.gloss !== chosen.dataset.reader;
        }
        readerName.textContent = chosen.textContent.trim();
    });
}

function setUpCheck() {
    const note = document.querySelector("[data-check]");
    const mark = document.querySelector("[data-check-mark]");
    const original = mark.querySelector("[data-check-original]");
    const fix = mark.querySelector("[data-check-fix]");
    const choices = note.querySelector("[data-check-choices]");
    const resetButton = note.querySelector('[data-check-action="reset"]');
    const status = note.querySelector("[data-check-status]");

    function settle(state, message) {
        mark.dataset.state = state;
        original.hidden = state === "fixed";
        fix.hidden = state !== "fixed";
        choices.hidden = state !== "open";
        resetButton.hidden = state === "open";
        status.textContent = message;
    }

    const outcomes = {
        accept: () => settle("fixed", status.dataset.accepted),
        discard: () => settle("kept", status.dataset.discarded),
        reset: () => settle("open", ""),
    };

    note.addEventListener("click", (event) => {
        const button = event.target.closest("[data-check-action]");
        if (button) outcomes[button.dataset.checkAction]();
    });
}

function playLoopsOnScreen() {
    if (reducedMotion.matches) return;

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
    for (const loop of document.querySelectorAll("video[data-loop]")) onScreen.observe(loop);
}

// The cat crosses the colophon once, when the reader reaches it.
function letTheCatWalk() {
    if (reducedMotion.matches) return;

    const colophon = document.querySelector("[data-colophon]");
    colophon.dataset.walk = "waiting";

    const arrival = new IntersectionObserver(
        ([entry]) => {
            if (!entry.isIntersecting) return;
            colophon.dataset.walk = "walked";
            arrival.disconnect();
        },
        { threshold: 0.45 },
    );
    arrival.observe(colophon);
}

letGoldFollowThePointer();
setUpMenu();
setUpCreatures();
setUpInkDemo();
setUpReaders();
setUpCheck();
playLoopsOnScreen();
letTheCatWalk();
