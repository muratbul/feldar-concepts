// Concept I, The novel's ledger. Three behaviours: the account book shows one entry at
// a time (an accordion on a phone), the hero's ledger rows open the entry that keeps
// each account, and the demo page lets the visitor accept, revise or dismiss a
// suggested line. All copy lives in the markup.
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const phone = window.matchMedia("(max-width: 860px)");
const STEP_KEYS = { ArrowDown: 1, ArrowUp: -1 };

const book = document.querySelector("[data-book]");
const entryButtons = Array.from(book.querySelectorAll("[data-entry-button]"));
const tabs = Array.from(book.querySelectorAll("[data-tab]"));
const pagerButtons = Array.from(book.querySelectorAll("[data-step]"));
const loops = Array.from(book.querySelectorAll("video[data-loop]"));

let openButton = entryButtons.find((button) => button.getAttribute("aria-expanded") === "true") ?? null;
let bookOnScreen = false;

function panelFor(button) {
    return document.getElementById(button.getAttribute("aria-controls"));
}

function accountOf(button) {
    return button.closest("[data-account]").dataset.account;
}

function buttonFor(entryName) {
    return entryButtons.find((button) => button.dataset.entryButton === entryName);
}

function syncLoops() {
    for (const loop of loops) {
        const shouldPlay = bookOnScreen && !reducedMotion.matches && loop.closest(".lg-panel").classList.contains("is-open");
        if (shouldPlay) {
            loop.play().catch(() => undefined);
        } else {
            loop.pause();
        }
    }
}

function syncPager() {
    const position = entryButtons.indexOf(openButton);
    for (const pagerButton of pagerButtons) {
        const neighbour = entryButtons[position + Number(pagerButton.dataset.step)];
        pagerButton.disabled = !neighbour;
        pagerButton.querySelector("[data-pager-name]").textContent = neighbour
            ? neighbour.querySelector(".lg-entry-name").textContent
            : "";
    }
}

function show(button) {
    for (const entryButton of entryButtons) {
        const isOpen = entryButton === button;
        entryButton.setAttribute("aria-expanded", String(isOpen));
        panelFor(entryButton).classList.toggle("is-open", isOpen);
    }

    openButton = button;
    const account = button ? accountOf(button) : null;
    for (const tab of tabs) {
        if (tab.dataset.account === account) {
            tab.setAttribute("aria-current", "true");
        } else {
            tab.removeAttribute("aria-current");
        }
    }

    if (button) syncPager();
    syncLoops();
}

function scrollBehaviour() {
    return reducedMotion.matches ? "auto" : "smooth";
}

function openEntry(entryName) {
    const button = buttonFor(entryName);
    show(button);
    const target = phone.matches ? button : book;
    target.scrollIntoView({ behavior: scrollBehaviour(), block: "start" });
}

book.addEventListener("click", (event) => {
    const entryButton = event.target.closest("[data-entry-button]");
    if (entryButton) {
        const isClosingOnPhone = phone.matches && entryButton === openButton;
        show(isClosingOnPhone ? null : entryButton);
        return;
    }

    const tab = event.target.closest("[data-tab]");
    if (tab) {
        show(buttonFor(tab.dataset.tab));
        return;
    }

    const pagerButton = event.target.closest("[data-step]");
    if (!pagerButton) return;
    const position = entryButtons.indexOf(openButton);
    show(entryButtons[position + Number(pagerButton.dataset.step)]);
});

// Up and Down move through the index; Home and End jump to its first and last entry.
book.addEventListener("keydown", (event) => {
    const focusedAt = entryButtons.indexOf(event.target);
    if (focusedAt === -1) return;

    let next;
    if (event.key in STEP_KEYS) next = entryButtons[focusedAt + STEP_KEYS[event.key]];
    if (event.key === "Home") next = entryButtons[0];
    if (event.key === "End") next = entryButtons.at(-1);
    if (!next) return;

    event.preventDefault();
    next.focus();
});

phone.addEventListener("change", () => {
    if (!openButton) show(entryButtons[0]);
});

for (const row of document.querySelectorAll("[data-open-entry]")) {
    row.addEventListener("click", (event) => {
        event.preventDefault();
        openEntry(row.dataset.openEntry);
    });
}

if (reducedMotion.matches) {
    for (const loop of loops) loop.controls = true;
}

new IntersectionObserver(
    ([entry]) => {
        bookOnScreen = entry.isIntersecting;
        syncLoops();
    },
    { threshold: 0.25 },
).observe(book);

show(openButton);

const demo = document.querySelector("[data-demo]");
const continuations = Array.from(demo.querySelectorAll("[data-continuation]"));
const reviewActions = demo.querySelector("[data-review]");
const idleActions = demo.querySelector("[data-idle]");
const continueButton = demo.querySelector('[data-action="continue"]');
const restartButton = demo.querySelector('[data-action="restart"]');
const demoStatus = demo.querySelector("[data-status]");

let pendingIndex = 0;

function setState(continuation, state) {
    continuation.dataset.state = state;
    const from = continuation.querySelector("[data-from]");
    from.textContent = from.dataset[state];
}

function showVariant(continuation, position) {
    continuation.querySelectorAll("[data-variant]").forEach((variant, variantAt) => {
        variant.hidden = variantAt !== position;
    });
}

function showNextVariant(continuation) {
    const variants = Array.from(continuation.querySelectorAll("[data-variant]"));
    const shownAt = variants.findIndex((variant) => !variant.hidden);
    showVariant(continuation, (shownAt + 1) % variants.length);
}

function settle(message) {
    const isSpent = pendingIndex === continuations.length;
    reviewActions.hidden = true;
    idleActions.hidden = false;
    continueButton.hidden = isSpent;
    restartButton.hidden = !isSpent;
    demoStatus.textContent = message;
    (isSpent ? restartButton : continueButton).focus({ preventScroll: true });
}

function suggest() {
    const continuation = continuations[pendingIndex];
    setState(continuation, "waiting");
    continuation.hidden = false;
    idleActions.hidden = true;
    reviewActions.hidden = false;
    demoStatus.textContent = "";
    reviewActions.querySelector("button").focus({ preventScroll: true });
}

const demoActions = {
    accept() {
        setState(continuations[pendingIndex], "kept");
        pendingIndex += 1;
        settle(demoStatus.dataset.accepted);
    },
    revise() {
        showNextVariant(continuations[pendingIndex]);
    },
    // The next request for the same line brings the other take.
    dismiss() {
        const continuation = continuations[pendingIndex];
        continuation.hidden = true;
        showNextVariant(continuation);
        settle(demoStatus.dataset.dismissed);
    },
    continue: suggest,
    restart() {
        for (const continuation of continuations) {
            continuation.hidden = true;
            showVariant(continuation, 0);
        }
        pendingIndex = 0;
        suggest();
    },
};

demo.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (button) demoActions[button.dataset.action]();
});
