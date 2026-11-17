// Typewriter component. The machine types its intro lines, takes the visitor's own
// keystrokes, and a two-colour ribbon decides whose line is being struck: black for the
// visitor, blue for Feldar. runRibbonDemo is the accept, revise and dismiss logic on its
// own, for a plain page demo without a machine. All copy lives in the markup; each
// continuation holds its alternative takes as variants. Markup: typewriter.html.
const STRIKE_INTERVAL_MS = 42;
const LINE_PAUSE_MS = 220;
const KEY_DOWN_MS = 110;
const BELL_WARNING_CHARACTERS = 5;
const KEPT_LINE_LIMIT = 2;
const BELL_SWING = [
    { transform: "rotate(0deg)" },
    { transform: "rotate(16deg)" },
    { transform: "rotate(-11deg)" },
    { transform: "rotate(6deg)" },
    { transform: "rotate(0deg)" },
];
const BELL_SWING_MS = 520;
const INTRO_VISIBLE_SHARE = 0.5;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function pause(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// Reveals a line one character at a time. The whole text stays laid out from the
// start, with the part not yet struck only hidden, so nothing reflows as it types.
function strike(line, onCharacter = () => {}) {
    if (reducedMotion.matches) return Promise.resolve();

    const text = line.textContent;
    const struck = document.createElement("span");
    const unstruck = document.createElement("span");
    unstruck.className = "tw-unstruck";
    unstruck.textContent = text;
    line.replaceChildren(struck, unstruck);

    return new Promise((resolve) => {
        let struckCount = 0;
        const timer = setInterval(() => {
            struckCount += 1;
            struck.textContent = text.slice(0, struckCount);
            unstruck.textContent = text.slice(struckCount);
            onCharacter(text[struckCount - 1], struckCount / text.length);
            if (struckCount < text.length) return;

            clearInterval(timer);
            line.textContent = text;
            resolve();
        }, STRIKE_INTERVAL_MS);
    });
}

function visibleVariant(continuation) {
    return continuation.querySelector("[data-variant]:not([hidden])");
}

function showNextVariant(continuation) {
    const variants = Array.from(continuation.querySelectorAll("[data-variant]"));
    const shownAt = variants.indexOf(visibleVariant(continuation));
    variants[shownAt].hidden = true;
    variants[(shownAt + 1) % variants.length].hidden = false;
}

function showFirstVariant(continuation) {
    continuation.querySelectorAll("[data-variant]").forEach((variant, position) => {
        variant.hidden = position > 0;
    });
}

// One suggestion at a time: ask, then accept, revise or dismiss it. A machine passes
// hooks to move its ribbon and keys; a plain page demo passes none.
export function runRibbonDemo(demo, hooks = {}) {
    const continuations = Array.from(demo.querySelectorAll("[data-continuation]"));
    const review = demo.querySelector("[data-review]");
    const idle = demo.querySelector("[data-idle]");
    const continueButton = demo.querySelector('[data-action="continue"]');
    const restartButton = demo.querySelector('[data-action="restart"]');
    const reviseButton = demo.querySelector('[data-action="revise"]');
    const acceptButton = demo.querySelector('[data-action="accept"]');
    const status = demo.querySelector("[data-status]");
    const {
        onAsk = () => {},
        onSettle = () => {},
        onRestart = () => {},
        onCharacter,
        isBusy = () => false,
        keepAccepted = (continuation) => continuation.classList.add("is-accepted"),
    } = hooks;

    let nextIndex = 0;
    let pending = continuations.find((continuation) => !continuation.hidden) ?? null;
    let isStriking = false;

    async function strikePending() {
        isStriking = true;
        review.hidden = true;
        idle.hidden = true;
        await strike(visibleVariant(pending), onCharacter);
        isStriking = false;
        review.hidden = false;
    }

    function settle(message) {
        const isSpent = nextIndex === continuations.length;
        pending = null;
        review.hidden = true;
        idle.hidden = false;
        continueButton.hidden = isSpent;
        restartButton.hidden = !isSpent;
        status.textContent = message;
        onSettle();
        (isSpent ? restartButton : continueButton).focus({ preventScroll: true });
    }

    const actions = {
        async continue() {
            pending = continuations[nextIndex];
            status.textContent = "";
            onAsk();
            pending.hidden = false;
            await strikePending();
            acceptButton.focus({ preventScroll: true });
        },
        accept() {
            keepAccepted(pending);
            nextIndex += 1;
            settle(status.dataset.accepted);
        },
        async revise() {
            showNextVariant(pending);
            await strikePending();
            reviseButton.focus({ preventScroll: true });
        },
        dismiss() {
            pending.hidden = true;
            settle(status.dataset.dismissed);
        },
        restart() {
            for (const continuation of continuations) {
                continuation.classList.remove("is-accepted");
                continuation.hidden = true;
                showFirstVariant(continuation);
            }
            nextIndex = 0;
            onRestart();
            actions.continue();
        },
        // The ribbon lever is the same request by another control: flipping to blue
        // asks Feldar for a line, flipping back to black waves the line away.
        ribbon() {
            if (pending) {
                actions.dismiss();
            } else if (nextIndex === continuations.length) {
                actions.restart();
            } else {
                actions.continue();
            }
        },
    };

    demo.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action]");
        if (!button || isStriking || isBusy()) return;
        actions[button.dataset.action]();
    });
}

function onceVisible(element, handle) {
    const observer = new IntersectionObserver(
        ([entry]) => {
            if (!entry.isIntersecting) return;
            observer.disconnect();
            handle();
        },
        { threshold: INTRO_VISIBLE_SHARE },
    );
    observer.observe(element);
}

// typeIntro is "load" (type the intro lines straight away), "visible" (type them when
// half the machine is on screen) or "none" (show them as they are).
export function setUpTypewriter(machine, { typeIntro = "load" } = {}) {
    const carriage = machine.querySelector("[data-carriage]");
    const keyboard = machine.querySelector("[data-keyboard]");
    const ownLine = machine.querySelector("[data-own-line]");
    const keptLines = machine.querySelector("[data-kept]");
    const ribbon = machine.querySelector('[data-action="ribbon"]');
    const bell = machine.querySelector("[data-bell]");
    const status = machine.querySelector("[data-status]");
    let isTypingIntro = false;

    function moveCarriage(lineProgress) {
        carriage.style.setProperty("--tw-progress", lineProgress);
    }

    function pressKey(character) {
        if (reducedMotion.matches) return;
        const key = keyboard.querySelector(`[data-key="${CSS.escape(character.toLowerCase())}"]`);
        if (!key) return;
        key.classList.add("is-down");
        setTimeout(() => key.classList.remove("is-down"), KEY_DOWN_MS);
    }

    function typeCharacter(character, lineProgress) {
        pressKey(character);
        moveCarriage(lineProgress);
    }

    function keepLine(text) {
        const line = document.createElement("p");
        line.className = "tw-line";
        line.textContent = text;
        keptLines.append(line);
        if (keptLines.children.length > KEPT_LINE_LIMIT) keptLines.firstElementChild.remove();
    }

    function returnCarriage() {
        if (ownLine.value.trim()) keepLine(ownLine.value);
        ownLine.value = "";
        moveCarriage(0);
    }

    function setRibbon(isBlue) {
        ribbon.setAttribute("aria-checked", String(isBlue));
        machine.classList.toggle("is-blue", isBlue);
        ownLine.hidden = isBlue;
    }

    // A page that types on load also sets tw-will-type on the root before first paint,
    // so the intro never flashes; both places are cleared once it has been typed.
    async function typeIntroLines() {
        isTypingIntro = true;
        ownLine.disabled = true;
        for (const line of machine.querySelectorAll("[data-type-line]")) {
            line.classList.add("is-struck");
            await strike(line, typeCharacter);
            await pause(LINE_PAUSE_MS);
            moveCarriage(0);
        }
        ownLine.disabled = false;
        isTypingIntro = false;
        machine.classList.remove("tw-will-type");
        document.documentElement.classList.remove("tw-will-type");
    }

    ownLine.addEventListener("input", (event) => {
        if (event.data) pressKey(event.data.at(-1));
        moveCarriage(ownLine.value.length / ownLine.maxLength);

        if (ownLine.maxLength - ownLine.value.length !== BELL_WARNING_CHARACTERS) return;
        status.textContent = status.dataset.bell;
        if (!reducedMotion.matches) bell.animate(BELL_SWING, BELL_SWING_MS);
    });

    ownLine.addEventListener("keydown", (event) => {
        if (event.key === "Enter") returnCarriage();
    });

    machine.querySelector("[data-return]").addEventListener("click", returnCarriage);

    // The drawn keys type too, which lets a phone use the machine without its own
    // keyboard opening.
    keyboard.addEventListener("click", (event) => {
        const key = event.target.closest("[data-key]");
        const isFull = ownLine.value.length === ownLine.maxLength;
        if (!key || ownLine.hidden || ownLine.disabled || isFull) return;
        ownLine.value += key.dataset.key;
        ownLine.dispatchEvent(new InputEvent("input", { data: key.dataset.key }));
    });

    runRibbonDemo(machine, {
        onAsk() {
            returnCarriage();
            setRibbon(true);
        },
        onSettle() {
            setRibbon(false);
            moveCarriage(0);
        },
        onRestart() {
            keptLines.replaceChildren();
        },
        onCharacter: typeCharacter,
        isBusy: () => isTypingIntro,
        keepAccepted(continuation) {
            keepLine(visibleVariant(continuation).textContent);
            continuation.hidden = true;
        },
    });

    if (typeIntro === "none" || reducedMotion.matches) return;

    machine.classList.add("tw-will-type");
    if (typeIntro === "visible") {
        onceVisible(machine, typeIntroLines);
    } else {
        typeIntroLines();
    }
}
