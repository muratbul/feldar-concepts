// The working sample of the editor. Each thing to try has its page in the markup, set at
// its first frame, and its responses are prepared there too. This script only moves a
// page from one state to the next, the way the app would. Nothing is sent anywhere.

import { paintInkGround } from "./ink-ground.js";

const WORD_MS = 22;
const STEP_MS = 620;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const wholeNumber = new Intl.NumberFormat("en-US");

const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;

// Resolves true when the time has passed and false if the run was called off first.
function wait(milliseconds, signal) {
    return new Promise((resolve) => {
        if (signal.aborted) {
            resolve(false);
            return;
        }
        const timer = setTimeout(() => resolve(true), milliseconds);
        signal.addEventListener(
            "abort",
            () => {
                clearTimeout(timer);
                resolve(false);
            },
            { once: true },
        );
    });
}

// Adds text a word at a time, as a response arrives in the app.
async function streamWords(target, text, signal) {
    if (reducedMotion.matches) {
        target.append(text);
        return !signal.aborted;
    }
    for (const word of text.match(/\s*\S+\s*/g) ?? []) {
        target.append(word);
        if (!(await wait(WORD_MS, signal))) return false;
    }
    return true;
}

// The same for prepared text that carries marks: each mark is rebuilt and filled in turn.
async function streamNodes(target, nodes, signal) {
    for (const node of nodes) {
        const holder = node.nodeType === Node.ELEMENT_NODE ? target.appendChild(node.cloneNode(false)) : target;
        if (!(await streamWords(holder, node.textContent, signal))) return false;
    }
    return true;
}

function createRecord(view) {
    const record = view.querySelector("[data-record]");
    const visitLine = record.querySelector("[data-visit]");
    const counts = {
        typed: Number(record.dataset.typed),
        feldar: Number(record.dataset.feldar),
        pasted: Number(record.dataset.pasted),
    };
    let fromVisit = 0;

    const show = () => {
        const total = counts.typed + counts.feldar + counts.pasted;
        const shares = {
            feldar: Math.round((counts.feldar / total) * 100),
            pasted: Math.round((counts.pasted / total) * 100),
        };
        // By hand is what the other two leave, so the three always make a hundred.
        shares.typed = 100 - shares.feldar - shares.pasted;

        for (const [source, count] of Object.entries(counts)) {
            record.querySelector(`[data-count-of="${source}"]`).textContent = wholeNumber.format(count);
            record.querySelector(`[data-share="${source}"]`).textContent = `${shares[source]}%`;
            record.querySelector(`[data-segment="${source}"]`).style.flexGrow = String(count);
        }
        record.querySelector("[data-total]").textContent = wholeNumber.format(total);
        visitLine.textContent = fromVisit
            ? visitLine.dataset.some.replace("{words}", wholeNumber.format(fromVisit))
            : visitLine.dataset.none;
    };

    return {
        add(words) {
            counts.feldar += words;
            fromVisit += words;
            show();
        },
    };
}

function initContinue(view, hero) {
    const variants = [...view.querySelectorAll("[data-variant]")];
    const menu = view.querySelector("[data-menu]");
    const mainChoices = menu.querySelector('[data-choices="main"]');
    const reviseChoices = menu.querySelector('[data-choices="revise"]');

    const shownSuggestion = () => view.querySelector(".eh-variant.is-shown .eh-suggestion");

    // The menu hangs under whichever version is showing, so it moves with it.
    const showSuggestion = (name) => {
        for (const variant of variants) {
            const isShown = variant.dataset.variant === name;
            variant.classList.toggle("is-shown", isShown);
            if (isShown) variant.append(menu);
        }
    };

    const showChoices = (choices) => {
        mainChoices.hidden = choices !== mainChoices;
        reviseChoices.hidden = choices !== reviseChoices;
    };

    const reset = () => {
        shownSuggestion().removeAttribute("data-prose");
        showSuggestion(variants[0].dataset.variant);
        showChoices(mainChoices);
        hero.setState(view, "pending");
    };

    view.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        const { choice, show } = button.dataset;

        if (show) {
            showSuggestion(show);
            showChoices(mainChoices);
            mainChoices.querySelector("button").focus();
            return;
        }
        if (choice === "revise") {
            showChoices(reviseChoices);
            reviseChoices.querySelector("button").focus();
            return;
        }
        if (choice === "accept") {
            const suggestion = shownSuggestion();
            suggestion.setAttribute("data-prose", "");
            hero.record.add(countWords(suggestion.textContent));
            hero.setState(view, "accepted");
            return;
        }
        if (choice === "dismiss") hero.setState(view, "dismissed");
    });

    view.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || view.dataset.state !== "pending") return;
        if (reviseChoices.hidden) {
            hero.setState(view, "dismissed");
            return;
        }
        showChoices(mainChoices);
        mainChoices.querySelector("button").focus();
    });

    menu.removeAttribute("inert");
    return reset;
}

function initPlan(view, hero) {
    const empty = view.querySelector("[data-plan-empty]");
    const steps = view.querySelector("[data-plan-steps]");
    const scenes = view.querySelector("[data-plan-scenes]");
    const note = view.querySelector("[data-plan-note]");
    const placeholder = view.querySelector("[data-placeholder]");
    const draft = view.querySelector("[data-draft]");
    const draftButton = view.querySelector("[data-draft-page]");
    const paragraphs = [...draft.children];
    const preparedDraft = paragraphs.map((paragraph) => paragraph.textContent);
    let run = new AbortController();

    const generateScenes = async () => {
        const { signal } = run;
        empty.hidden = true;
        steps.hidden = false;
        hero.setState(view, "planning");

        for (const step of steps.children) {
            step.dataset.step = "doing";
            if (!(await wait(reducedMotion.matches ? 0 : STEP_MS, signal))) return;
            step.dataset.step = "done";
        }

        steps.hidden = true;
        scenes.hidden = false;
        hero.setState(view, "planned");
        draftButton.focus();
    };

    const draftPage = async () => {
        const { signal } = run;
        draftButton.hidden = true;
        placeholder.hidden = true;
        for (const paragraph of paragraphs) paragraph.textContent = "";
        draft.hidden = false;
        hero.setState(view, "drafting");

        for (const [index, paragraph] of paragraphs.entries()) {
            if (!(await streamWords(paragraph, preparedDraft[index], signal))) return;
            hero.showCount(view);
        }

        const words = countWords(preparedDraft.join(" "));
        note.textContent = note.dataset.drafted.replace("{words}", wholeNumber.format(words));
        hero.record.add(words);
        hero.setState(view, "drafted");
    };

    const reset = () => {
        run.abort();
        run = new AbortController();
        for (const step of steps.children) step.removeAttribute("data-step");
        for (const [index, paragraph] of paragraphs.entries()) paragraph.textContent = preparedDraft[index];
        note.textContent = note.dataset.planned;
        empty.hidden = false;
        steps.hidden = true;
        scenes.hidden = true;
        draft.hidden = true;
        draftButton.hidden = false;
        placeholder.hidden = false;
        hero.setState(view, "empty");
    };

    view.querySelector("[data-generate]").addEventListener("click", generateScenes);
    draftButton.addEventListener("click", draftPage);
    return reset;
}

function initRewrite(view, hero) {
    const passage = view.querySelector("[data-passage]");
    const bubble = view.querySelector("[data-bubble]");
    const defineButton = view.querySelector("[data-define]");
    const menu = view.querySelector("[data-define-menu]");
    const levels = [...menu.querySelectorAll("[data-level]")];
    const card = view.querySelector("[data-card]");
    const cardTitle = card.querySelector("[data-card-title]");
    const cardText = card.querySelector("[data-card-text]");
    const cardFoot = card.querySelector("[data-card-foot]");
    const ownWords = passage.textContent;
    let run = new AbortController();

    const showLevel = (name) => {
        for (const level of levels) level.hidden = level.dataset.level !== name;
        menu.querySelector(`[data-level="${name}"] button`).focus();
    };

    const closeMenu = () => {
        menu.hidden = true;
        defineButton.setAttribute("aria-expanded", "false");
    };

    const openMenu = () => {
        menu.hidden = false;
        defineButton.setAttribute("aria-expanded", "true");
        showLevel("groups");
    };

    const showRewrite = async (name) => {
        const { signal } = run;
        const prepared = view.querySelector(`template[data-rewrite-text="${name}"]`);
        closeMenu();
        bubble.hidden = true;
        cardTitle.textContent = prepared.dataset.label;
        cardText.textContent = "";
        cardFoot.hidden = true;
        card.hidden = false;
        card.scrollIntoView({ block: "nearest" });
        hero.setState(view, "rewriting");

        if (!(await streamNodes(cardText, prepared.content.childNodes, signal))) return;

        cardFoot.hidden = false;
        hero.setState(view, "rewritten");
        cardFoot.querySelector("[data-apply]").focus();
    };

    const keepOwnWords = () => {
        run.abort();
        run = new AbortController();
        passage.textContent = ownWords;
        card.hidden = true;
        bubble.hidden = false;
        closeMenu();
        hero.setState(view, "selected");
    };

    const applyRewrite = () => {
        const newWords = [...cardText.querySelectorAll("mark")].map((mark) => mark.textContent).join(" ");
        passage.replaceChildren(...cardText.childNodes);
        card.hidden = true;
        hero.record.add(countWords(newWords));
        hero.setState(view, "applied");
    };

    view.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) return;

        if (button === defineButton) {
            if (menu.hidden) openMenu();
            else closeMenu();
            return;
        }
        if (button.dataset.group) showLevel(button.dataset.group);
        else if (button.dataset.rewrite) showRewrite(button.dataset.rewrite);
        else if (button.hasAttribute("data-apply")) applyRewrite();
        else if (button.hasAttribute("data-keep")) keepOwnWords();
    });

    // Escape steps back the way it came: from a group to the groups, then out of the menu.
    view.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || menu.hidden) return;
        if (menu.querySelector('[data-level="groups"]').hidden) {
            showLevel("groups");
            return;
        }
        closeMenu();
        defineButton.focus();
    });

    return keepOwnWords;
}

function initEditorHero(root) {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const views = new Map([...root.querySelectorAll("[data-view]")].map((view) => [view.dataset.view, view]));
    const status = root.querySelector("[data-status]");
    const resetButton = root.querySelector("[data-reset]");
    const crumb = root.querySelector("[data-crumb]");
    const count = root.querySelector("[data-count]");
    const chapterRows = [...root.querySelectorAll("[data-chapter-row]")];
    const firstStates = new Map([...views].map(([part, view]) => [part, view.dataset.state]));

    const onScreen = () => views.get(root.dataset.part);

    // The header's count is the manuscript's: prose that is on the page and kept.
    const showCount = (view) => {
        if (view !== onScreen()) return;
        count.parentElement.hidden = view.hasAttribute("data-no-count");
        const prose = [...view.querySelectorAll("[data-prose]")].filter((paragraph) => !paragraph.closest("[hidden]"));
        count.textContent = wholeNumber.format(countWords(prose.map((paragraph) => paragraph.textContent).join(" ")));
    };

    const showView = (view) => {
        const { state } = view.dataset;
        status.textContent = view.dataset[`status${state[0].toUpperCase()}${state.slice(1)}`];
        resetButton.hidden = state === firstStates.get(view.dataset.view);
        crumb.textContent = view.dataset.crumb ?? view.dataset.chapter;
        for (const row of chapterRows) row.classList.toggle("is-current", row.textContent === view.dataset.chapter);
        showCount(view);
    };

    const hero = {
        record: createRecord(views.get("record")),
        showCount,
        setState(view, state) {
            view.dataset.state = state;
            if (view === onScreen()) showView(view);
        },
    };

    const resets = {
        plan: initPlan(views.get("plan"), hero),
        continue: initContinue(views.get("continue"), hero),
        rewrite: initRewrite(views.get("rewrite"), hero),
    };

    const select = (tab) => {
        for (const other of tabs) {
            const isSelected = other === tab;
            other.setAttribute("aria-selected", String(isSelected));
            other.tabIndex = isSelected ? 0 : -1;
            views.get(other.dataset.part).hidden = !isSelected;
        }
        root.dataset.part = tab.dataset.part;
        showView(onScreen());
    };

    for (const tab of tabs) tab.addEventListener("click", () => select(tab));

    root.querySelector('[role="tablist"]').addEventListener("keydown", (event) => {
        const move = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (!move) return;
        const next = tabs[(tabs.indexOf(document.activeElement) + move + tabs.length) % tabs.length];
        next.focus();
        select(next);
    });

    resetButton.addEventListener("click", () => {
        resets[root.dataset.part]();
        tabs.find((tab) => tab.dataset.part === root.dataset.part).focus();
    });

    showView(onScreen());
}

const editorHero = document.querySelector("[data-editor-hero]");

if (editorHero) {
    initEditorHero(editorHero);
    paintInkGround(editorHero.querySelector("[data-ink-ground]"), editorHero.querySelector("[data-ink-clear]"));
}
