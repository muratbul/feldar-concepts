// Behaviour for the Night studio concept. Every demo keeps its copy in the markup and
// this file only moves state between what is already there. The Canvas board has its
// own module.
import "./night-studio-board.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Top bar: clear over the hero, blurred once the page moves under it.

const bar = document.querySelector("[data-bar]");
const menuToggle = bar.querySelector("[data-menu-toggle]");

function syncBarToScroll() {
    bar.classList.toggle("is-scrolled", window.scrollY > 8);
}

syncBarToScroll();
window.addEventListener("scroll", syncBarToScroll, { passive: true });

menuToggle.addEventListener("click", () => {
    const isOpen = bar.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
});

// Progress rail: marks the station crossing the middle of the screen.

const rail = document.querySelector("[data-rail]");
const railLinks = Array.from(rail.querySelectorAll("a"));

const stationWatcher = new IntersectionObserver(
    (entries) => {
        const crossing = entries.find((entry) => entry.isIntersecting);
        if (!crossing) return;

        for (const link of railLinks) {
            link.setAttribute("aria-current", String(link.hash === `#${crossing.target.id}`));
        }
    },
    { rootMargin: "-50% 0px -50% 0px" },
);

for (const station of document.querySelectorAll("[data-station]")) {
    stationWatcher.observe(station);
}

new IntersectionObserver(
    ([entry]) => rail.classList.toggle("is-visible", entry.isIntersecting),
    { rootMargin: "-40% 0px -40% 0px" },
).observe(document.querySelector("[data-stations]"));

// Choosers: a row of buttons that shows one panel at a time (the rewrite versions, the
// Lens readers, the views of the real app).

function choose(chooser, name) {
    for (const option of chooser.querySelectorAll("[data-choose]")) {
        option.setAttribute("aria-pressed", String(option.dataset.choose === name));
    }
    for (const panel of chooser.querySelectorAll("[data-chosen]")) {
        panel.hidden = panel.dataset.chosen !== name;
    }
    chooser.dispatchEvent(new CustomEvent("chosen", { detail: name }));
}

document.addEventListener("click", (event) => {
    const option = event.target.closest("[data-choose]");
    if (option) choose(option.closest("[data-chooser]"), option.dataset.choose);
});

// The real app: a loop plays only while its view is the one showing.

const shots = document.querySelector("[data-shots]");

shots.addEventListener("chosen", () => {
    for (const loop of shots.querySelectorAll("video")) {
        if (loop.closest("[data-chosen]").hidden || reducedMotion.matches) {
            loop.pause();
        } else {
            loop.play().catch(() => undefined);
        }
    }
});

// Writing record: the bar fills the first time it is seen.

const record = document.querySelector("[data-record]");

record.classList.add("is-waiting");
new IntersectionObserver(
    ([entry], watcher) => {
        if (!entry.isIntersecting) return;
        record.classList.remove("is-waiting");
        watcher.disconnect();
    },
    { threshold: 0.6 },
).observe(record);

// Hero page: each continuation arrives in blue, word by word, and waits for a verdict.

const ink = document.querySelector("[data-ink]");
const inkPage = ink.querySelector("[data-ink-page]");
const continuations = Array.from(ink.querySelectorAll("[data-ink-continuation]"));
const reviewKeys = ink.querySelector("[data-ink-review]");
const idleKeys = ink.querySelector("[data-ink-idle]");
const acceptKey = ink.querySelector('[data-ink-action="accept"]');
const continueKey = ink.querySelector('[data-ink-action="continue"]');
const restartKey = ink.querySelector('[data-ink-action="restart"]');
const inkStatus = ink.querySelector("[data-ink-status]");

const INK_SHORTCUTS = { r: "revise", R: "revise", Escape: "dismiss" };

let continuationIndex = 0;

function splitIntoWords(variant) {
    const words = variant.textContent.trim().split(/\s+/);
    variant.replaceChildren(
        ...words.flatMap((word, position) => {
            const wordSpan = document.createElement("span");
            wordSpan.className = "ns-word";
            wordSpan.style.setProperty("--word", position);
            wordSpan.textContent = word;
            return [wordSpan, " "];
        }),
    );
}

function arrive(continuation) {
    continuation.hidden = false;
    continuation.classList.remove("is-arriving");
    // Reading a layout value between the two class changes restarts the word animation.
    void continuation.offsetWidth;
    continuation.classList.add("is-arriving");
}

function showNextVariant(continuation) {
    const variants = Array.from(continuation.querySelectorAll("[data-ink-variant]"));
    const shownIndex = variants.findIndex((variant) => !variant.hidden);
    variants[shownIndex].hidden = true;
    variants[(shownIndex + 1) % variants.length].hidden = false;
}

function primaryKey() {
    if (!reviewKeys.hidden) return acceptKey;
    return continueKey.hidden ? restartKey : continueKey;
}

function showIdleKeys(message) {
    const isFinished = continuationIndex === continuations.length;
    reviewKeys.hidden = true;
    idleKeys.hidden = false;
    continueKey.hidden = isFinished;
    restartKey.hidden = !isFinished;
    inkStatus.textContent = message;
    primaryKey().focus();
}

const inkActions = {
    accept() {
        continuations[continuationIndex].classList.add("is-accepted");
        continuationIndex += 1;
        showIdleKeys(inkStatus.dataset.accepted);
    },
    revise() {
        showNextVariant(continuations[continuationIndex]);
        arrive(continuations[continuationIndex]);
    },
    dismiss() {
        continuations[continuationIndex].hidden = true;
        showIdleKeys(inkStatus.dataset.dismissed);
    },
    continue() {
        arrive(continuations[continuationIndex]);
        idleKeys.hidden = true;
        reviewKeys.hidden = false;
        inkStatus.textContent = "";
        primaryKey().focus();
    },
    restart() {
        for (const continuation of continuations) {
            continuation.classList.remove("is-accepted");
            continuation.hidden = true;
        }
        continuationIndex = 0;
        inkActions.continue();
    },
};

ink.addEventListener("click", (event) => {
    const key = event.target.closest("[data-ink-action]");
    if (key) inkActions[key.dataset.inkAction]();
});

ink.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === "Enter" && event.target === inkPage) {
        // The action moves focus to a key; without this the same Enter would press it too.
        event.preventDefault();
        primaryKey().click();
        return;
    }

    const shortcut = INK_SHORTCUTS[event.key];
    if (shortcut && !reviewKeys.hidden) inkActions[shortcut]();
});

for (const variant of ink.querySelectorAll("[data-ink-variant]")) splitIntoWords(variant);
arrive(continuations[0]);

// Plan: scenes arrive one at a time, then Draft Page shows the real app.

const plan = document.querySelector("[data-plan]");
const sceneRows = Array.from(plan.querySelectorAll("[data-plan-scene]"));
const sceneCount = plan.querySelector("[data-plan-count]");
const fewerScenes = plan.querySelector('[data-plan-step="-1"]');
const moreScenes = plan.querySelector('[data-plan-step="1"]');
const generateButton = plan.querySelector("[data-plan-generate]");
const draftButton = plan.querySelector("[data-plan-draft]");
const draftedPage = plan.querySelector("[data-plan-page]");
const noScenesHint = plan.querySelector("[data-plan-empty]");
const planStatus = plan.querySelector("[data-plan-status]");

const SCENE_ARRIVAL_MS = 320;
const FEWEST_SCENES = Number(sceneCount.dataset.min);
const MOST_SCENES = Number(sceneCount.dataset.max);

function setSceneCount(count) {
    sceneCount.value = count;
    fewerScenes.disabled = count === FEWEST_SCENES;
    moreScenes.disabled = count === MOST_SCENES;
}

function clearPlan() {
    for (const row of sceneRows) row.hidden = true;
    draftButton.hidden = true;
    draftedPage.hidden = true;
}

function generateScenes() {
    const wantedRows = sceneRows.slice(0, Number(sceneCount.value));
    const arrivalGap = reducedMotion.matches ? 0 : SCENE_ARRIVAL_MS;

    clearPlan();
    noScenesHint.hidden = true;
    generateButton.disabled = true;
    planStatus.textContent = planStatus.dataset.generating;

    wantedRows.forEach((row, position) => {
        setTimeout(() => {
            row.hidden = false;
        }, position * arrivalGap);
    });

    setTimeout(() => {
        generateButton.disabled = false;
        draftButton.hidden = false;
        planStatus.textContent = planStatus.dataset.ready;
    }, wantedRows.length * arrivalGap);
}

fewerScenes.addEventListener("click", () => setSceneCount(Number(sceneCount.value) - 1));
moreScenes.addEventListener("click", () => setSceneCount(Number(sceneCount.value) + 1));
generateButton.addEventListener("click", generateScenes);
draftButton.addEventListener("click", () => {
    draftButton.hidden = true;
    draftedPage.hidden = false;
    planStatus.textContent = planStatus.dataset.drafted;
});

setSceneCount(Number(sceneCount.value));
clearPlan();
noScenesHint.hidden = false;

// Write: a rewrite stays blue until it is applied, and Undo brings the original back.

const rewrite = document.querySelector("[data-rewrite]");
const applyKey = rewrite.querySelector("[data-rewrite-apply]");
const undoKey = rewrite.querySelector("[data-rewrite-undo]");
const rewriteStatus = rewrite.querySelector("[data-rewrite-status]");

rewrite.addEventListener("chosen", (event) => {
    for (const version of rewrite.querySelectorAll("[data-chosen]")) {
        version.classList.remove("is-applied");
    }
    applyKey.disabled = event.detail === "original";
    undoKey.disabled = true;
    rewriteStatus.textContent = "";
});

applyKey.addEventListener("click", () => {
    rewrite.querySelector("[data-chosen]:not([hidden])").classList.add("is-applied");
    applyKey.disabled = true;
    undoKey.disabled = false;
    rewriteStatus.textContent = rewriteStatus.dataset.applied;
    undoKey.focus();
});

undoKey.addEventListener("click", () => {
    choose(rewrite, "original");
    rewriteStatus.textContent = rewriteStatus.dataset.undone;
    rewrite.querySelector('[data-choose="original"]').focus();
});

// Revise: each marked phrase opens its check; accepting the fix raises the score.

const checks = document.querySelector("[data-checks]");
const checksScore = checks.querySelector("[data-checks-score]");
const checksMeter = checks.querySelector("[data-checks-meter]");
const checksHint = checks.querySelector("[data-checks-hint]");
const checksDone = checks.querySelector("[data-checks-done]");

function cardFor(issue) {
    return document.getElementById(issue.getAttribute("aria-controls"));
}

function openIssue(issue) {
    for (const marked of checks.querySelectorAll("[data-issue]")) {
        const isChosen = marked === issue;
        marked.setAttribute("aria-expanded", String(isChosen));
        cardFor(marked).hidden = !isChosen;
    }
    checksHint.hidden = true;
    cardFor(issue).querySelector("button").focus();
}

function settleIssue(card, verdict) {
    const issue = checks.querySelector(`[aria-controls="${card.id}"]`);

    if (verdict === "accept") {
        const fixed = document.createElement("span");
        fixed.className = "ns-issue-fixed";
        fixed.textContent = card.querySelector("[data-issue-fix]").textContent;
        issue.replaceWith(fixed);
        checksScore.value = Number(checksScore.value) + Number(card.dataset.points);
        checksMeter.style.setProperty("--score", checksScore.value);
    } else {
        issue.replaceWith(issue.textContent);
    }

    card.hidden = true;
    const nextIssue = checks.querySelector("[data-issue]");
    checksHint.hidden = !nextIssue;
    checksDone.hidden = Boolean(nextIssue);
    (nextIssue ?? checksDone).focus();
}

checks.addEventListener("click", (event) => {
    const issue = event.target.closest("[data-issue]");
    if (issue) {
        openIssue(issue);
        return;
    }

    const verdictKey = event.target.closest("[data-issue-verdict]");
    if (verdictKey) {
        settleIssue(verdictKey.closest("[data-issue-card]"), verdictKey.dataset.issueVerdict);
    }
});

// The marks are spans with a button role so they can wrap with the sentence, which
// means Enter and Space have to be wired by hand.
checks.addEventListener("keydown", (event) => {
    const issue = event.target.closest("[data-issue]");
    if (!issue || (event.key !== "Enter" && event.key !== " ")) return;

    event.preventDefault();
    openIssue(issue);
});
