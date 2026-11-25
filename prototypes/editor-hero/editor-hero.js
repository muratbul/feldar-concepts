// The working sample of the editor. Each thing to try has its page in the markup, set at
// its first frame, and its responses are prepared there too. This script only moves a
// page from one state to the next, the way the app would. Nothing is sent anywhere.
// Pages that show the editor import initEditorHero and call it on their own markup.

const WORD_MS = 22;
const STEP_MS = 520;
// Resolved from this module, so a page in another folder still finds the sprite.
const ICONS = new URL("app-icons.svg", import.meta.url).href;

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
        const timer = setTimeout(() => resolve(true), reducedMotion.matches ? 0 : milliseconds);
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

// A progress step shows one of the app's three marks: waiting, running or done.
function markStep(step, state) {
    step.dataset.step = state;
    step.querySelector("use").setAttribute("href", `${ICONS}#step-${state}`);
}

function createRecord(view, onVisitWords) {
    const record = view.querySelector("[data-record]");
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
    };

    return {
        add(words) {
            counts.feldar += words;
            fromVisit += words;
            show();
            onVisitWords(wholeNumber.format(fromVisit));
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
    const scenes = view.querySelector("[data-plan-scenes]");
    const note = view.querySelector("[data-plan-note]");
    const placeholder = view.querySelector("[data-placeholder]");
    const draft = view.querySelector("[data-draft]");
    const draftButton = view.querySelector("[data-draft-page]");
    const veil = view.querySelector("[data-plan-progress]");
    const progressTitle = veil.querySelector("[data-progress-title]");
    const stepLists = [...veil.querySelectorAll("[data-steps]")];
    let run = new AbortController();
    let draftCounted = false;

    for (const step of veil.querySelectorAll(".app-step")) {
        const mark = document.createElement("span");
        mark.className = "app-step-mark";
        mark.innerHTML = '<svg class="app-icon" aria-hidden="true"><use></use></svg>';
        step.prepend(mark);
    }

    // The app's progress card, over a veil: its steps tick through one at a time.
    const showProgress = async (kind, signal) => {
        const steps = [...veil.querySelectorAll(`[data-steps="${kind}"] .app-step`)];
        progressTitle.textContent = progressTitle.dataset[kind];
        for (const list of stepLists) list.hidden = list.dataset.steps !== kind;
        for (const step of steps) markStep(step, "waiting");
        veil.hidden = false;

        for (const step of steps) {
            markStep(step, "running");
            if (!(await wait(STEP_MS, signal))) return false;
            markStep(step, "done");
        }
        veil.hidden = true;
        return true;
    };

    const generateScenes = async () => {
        hero.setState(view, "planning");
        if (!(await showProgress("scenes", run.signal))) return;

        empty.hidden = true;
        scenes.hidden = false;
        hero.setState(view, "planned");
        draftButton.focus();
    };

    const draftPage = async () => {
        hero.setState(view, "drafting");
        if (!(await showProgress("draft", run.signal))) return;

        const words = countWords(draft.textContent);
        placeholder.hidden = true;
        draft.hidden = false;
        note.textContent = note.dataset.drafted.replace("{words}", wholeNumber.format(words));
        // A page drafted again in the same visit is the same words, so it is counted once.
        if (!draftCounted) hero.record.add(words);
        draftCounted = true;
        hero.setState(view, "drafted");
    };

    const reset = () => {
        run.abort();
        run = new AbortController();
        note.textContent = note.dataset.planned;
        veil.hidden = true;
        empty.hidden = false;
        scenes.hidden = true;
        draft.hidden = true;
        placeholder.hidden = false;
        view.dataset.panel = "open";
        hero.setState(view, "empty");
    };

    view.querySelector("[data-generate]").addEventListener("click", generateScenes);
    draftButton.addEventListener("click", draftPage);
    return reset;
}

function initRewrite(view, hero) {
    const passage = view.querySelector("[data-passage]");
    const selection = passage.closest(".app-select");
    const bubble = view.querySelector("[data-bubble]");
    const defineButton = view.querySelector("[data-define]");
    const menu = view.querySelector("[data-define-menu]");
    const groupRows = [...menu.querySelectorAll("[data-group]")];
    const lists = [...view.querySelectorAll("[data-level]")];
    const card = view.querySelector("[data-card]");
    const cardTitle = card.querySelector("[data-card-title]");
    const cardText = card.querySelector("[data-card-text]");
    const cardFoot = card.querySelector("[data-card-foot]");
    const ownWords = passage.textContent;
    let run = new AbortController();

    // A group's list opens beside the dropdown, which stays where it is.
    const openGroup = (name) => {
        for (const list of lists) list.hidden = list.dataset.level !== name;
        for (const row of groupRows) row.classList.toggle("is-open", row.dataset.group === name);
    };

    const closeMenu = () => {
        menu.hidden = true;
        openGroup(null);
        defineButton.setAttribute("aria-expanded", "false");
    };

    const openMenu = () => {
        selection.style.setProperty("--define-left", `${bubble.offsetLeft + defineButton.offsetLeft}px`);
        menu.hidden = false;
        defineButton.setAttribute("aria-expanded", "true");
        hero.setState(view, "choosing");
        groupRows[0].focus();
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
        hero.setState(view, "rewriting");
        card.scrollIntoView({ block: "nearest" });

        if (!(await streamNodes(cardText, prepared.content.childNodes, signal))) return;

        cardFoot.hidden = false;
        hero.setState(view, "rewritten");
        card.scrollIntoView({ block: "nearest" });
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
            if (menu.hidden) {
                openMenu();
                return;
            }
            closeMenu();
            hero.setState(view, "selected");
            return;
        }
        if (button.dataset.group) {
            openGroup(button.dataset.group);
            view.querySelector(`[data-level="${button.dataset.group}"] button`).focus();
        } else if (button.dataset.rewrite) showRewrite(button.dataset.rewrite);
        else if (button.hasAttribute("data-apply")) applyRewrite();
        else if (button.hasAttribute("data-keep")) keepOwnWords();
    });

    // Escape steps back the way it came: out of a list, out of the menu, or, as in the
    // app, out of a rewrite, which keeps the writer's own words.
    view.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;

        if (!card.hidden) {
            keepOwnWords();
            defineButton.focus();
            return;
        }
        if (menu.hidden) return;

        const openRow = groupRows.find((row) => row.classList.contains("is-open"));
        if (openRow) {
            openGroup(null);
            openRow.focus();
            return;
        }
        closeMenu();
        hero.setState(view, "selected");
        defineButton.focus();
    });

    return keepOwnWords;
}

export function initEditorHero(root) {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const views = new Map([...root.querySelectorAll("[data-view]")].map((view) => [view.dataset.view, view]));
    const status = root.querySelector("[data-status]");
    const resetButton = root.querySelector("[data-reset]");
    const crumb = root.querySelector("[data-crumb]");
    const count = root.querySelector("[data-count]");
    const scenesToggle = root.querySelector("[data-scenes-toggle]");
    const chapterRows = [...root.querySelectorAll("[data-chapter-row]")];
    const firstStates = new Map([...views].map(([part, view]) => [part, view.dataset.state]));
    // Where Back on the Writing record leads: the page that was open before it.
    let editorPart = root.dataset.part;

    const onScreen = () => views.get(root.dataset.part);
    const tabFor = (part) => tabs.find((tab) => tab.dataset.part === part);

    // The header's count is the manuscript's: prose that is on the page and kept.
    const showCount = (view) => {
        const prose = [...view.querySelectorAll("[data-prose]")].filter((paragraph) => !paragraph.closest("[hidden]"));
        count.textContent = wholeNumber.format(countWords(prose.map((paragraph) => paragraph.textContent).join(" ")));
    };

    const showView = (view) => {
        const { state } = view.dataset;
        status.textContent = view.dataset[`status${state[0].toUpperCase()}${state.slice(1)}`];
        resetButton.hidden = state === firstStates.get(view.dataset.view);
        crumb.textContent = view.dataset.chapter;
        scenesToggle.setAttribute("aria-pressed", String(view.dataset.panel === "open"));
        for (const row of chapterRows) row.classList.toggle("is-current", row.textContent === view.dataset.chapter);
        showCount(view);
    };

    const recordView = views.get("record");
    const hero = {
        record: createRecord(recordView, (visitWords) => {
            recordView.dataset.statusResting = recordView.dataset.statusSome.replace("{words}", visitWords);
        }),
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
        if (tab.dataset.part !== "record") editorPart = tab.dataset.part;
        showView(onScreen());
    };

    // The Scenes panel opens and closes from the header and from its own close button,
    // on the chapter that has one.
    const toggleScenes = () => {
        const view = onScreen();
        if (!view.dataset.panel) return;
        view.dataset.panel = view.dataset.panel === "open" ? "closed" : "open";
        showView(view);
    };

    root.addEventListener("click", (event) => {
        const tab = event.target.closest('[role="tab"]');
        const chapter = event.target.closest("[data-open-part]");

        if (tab) select(tab);
        else if (chapter) select(tabFor(chapter.dataset.openPart));
        else if (event.target.closest("[data-record-back]")) select(tabFor(editorPart));
        else if (event.target.closest("[data-scenes-toggle], [data-scenes-close]")) toggleScenes();
    });

    root.querySelector('[role="tablist"]').addEventListener("keydown", (event) => {
        const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
        if (!move) return;
        event.preventDefault();
        const next = tabs[(tabs.indexOf(document.activeElement) + move + tabs.length) % tabs.length];
        next.focus();
        select(next);
    });

    resetButton.addEventListener("click", () => {
        resets[root.dataset.part]();
        tabFor(root.dataset.part).focus();
    });

    showView(onScreen());
}
