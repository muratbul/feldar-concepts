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

// The Scenes panel's rows as the app has them once a generation pauses for review
// (docs/seo/app-ui/production-scenes-spec.md 3 and 4). A row lights on hover or focus and
// shows Delete and Rewrite; Add here opens under it; its number selects it; its title and
// description are edited in place. Rewrite swaps in the rewrite prepared on the row, and
// Continue from here draws on the scenes prepared in the markup, in order.
const REWRITE_MS = 1600;
const CONTINUE_MS = 2200;
// The app's scene count runs from 1 to 20 (4.3); here it also stops at what is prepared.
const CONTINUE_MAX = 20;
const BLANK_SCENE = { name: "What happens next?", text: "Describe your scene" };
const NO_MORE_PREPARED = "This sample has no more scenes prepared.";

function initSceneList(list, prepared, signal, onEmpty) {
    const markup = list.innerHTML;
    const continuations = [...prepared.content.querySelectorAll("article")];
    let continued = 0;

    const entries = () => [...list.querySelectorAll(".app-scene-entry")];
    const band = () => list.querySelector("[data-scene-band]");
    const remaining = () => continuations.length - continued;
    const icon = (name, className = "app-icon") =>
        `<svg class="${className}" aria-hidden="true"><use href="${ICONS}#${name}"></use></svg>`;

    const actionsMarkup = () => `
        <div class="app-scene-actions">
            <button type="button" class="app-scene-action" aria-label="Delete scene" data-tip="Delete scene" data-scene-delete>${icon("scene-delete", "app-icon app-icon--16")}</button>
            <button type="button" class="app-scene-action" aria-label="Rewrite scene" data-tip="Rewrite scene" data-scene-rewrite>${icon("scene-rewrite", "app-icon app-icon--16")}<span class="app-scene-spinner" hidden></span></button>
        </div>`;
    const slotMarkup = () => `
        <div class="app-scene-slot">
            <button type="button" class="app-scene-add" data-scene-add><span class="app-scene-add-mark">${icon("add-here")}</span>Add here</button>
        </div>`;
    const menuMarkup = () => {
        const exhausted = remaining() === 0;
        return `
            <div class="app-scene-menu" role="dialog" aria-label="Add scene">
                <p class="app-scene-menu-head">Add scene</p>
                <button type="button" class="app-scene-menu-item" data-scene-blank><span class="app-scene-menu-label">Write blank</span><span class="app-scene-menu-hint">Type your own scene</span></button>
                <button type="button" class="app-scene-menu-item" data-scene-continue${exhausted ? ` disabled title="${NO_MORE_PREPARED}"` : ""}><span class="app-scene-menu-label">Continue from here</span><span class="app-scene-menu-hint">${exhausted ? NO_MORE_PREPARED : "Feldar picks up the next beats"}</span></button>
                <div class="app-scene-menu-foot"><button type="button" class="app-scene-menu-cancel" data-scene-cancel>Cancel</button></div>
            </div>`;
    };
    const continueMarkup = () => `
        <div class="app-scene-menu" role="dialog" aria-label="Continue from here">
            <p class="app-scene-menu-head">Continue from here</p>
            <div class="app-scene-continue-body">
                <textarea class="app-scene-nudge" rows="2" placeholder="Optional nudge or leave blank" aria-label="Continuation guidance" data-scene-nudge></textarea>
            </div>
            <div class="app-scene-continue-foot">
                <div class="app-scene-count" role="group" aria-label="Scene count">
                    <button type="button" class="app-scene-count-button" aria-label="Decrease scene count" data-count-step="-1">${icon("count-less")}</button>
                    <span class="app-scene-count-value" data-count>1</span>
                    <button type="button" class="app-scene-count-button" aria-label="Increase scene count" data-count-step="1">${icon("count-more")}</button>
                </div>
                <button type="button" class="app-scene-small" data-scene-cancel>Cancel</button>
                <button type="button" class="app-scene-small app-scene-small--strong" data-continue-generate>Generate</button>
            </div>
        </div>`;
    // 4.3, while generating: the count and one skeleton row per scene to come, numbered
    // where it will land.
    const draftingMarkup = (count, firstNumber) => `
        <div class="app-scene-drafting">
            <p class="app-scene-drafting-head"><span class="app-scene-spinner app-scene-spinner--14"></span>Drafting ${count} ${count === 1 ? "scene" : "scenes"}</p>
            <ol class="app-scene-skeletons" aria-hidden="true">
                ${Array.from({ length: count }, (_, index) => `
                <li class="app-scene-skeleton">
                    <span class="app-scene-skeleton-number">${firstNumber + index}</span>
                    <span class="app-scene-skeleton-lines"><span></span><span></span><span></span></span>
                </li>`).join("")}
            </ol>
        </div>`;

    const setEditable = (entry, editable) => {
        for (const field of entry.querySelectorAll("[data-scene-name], [data-scene-text]")) {
            if (editable) {
                field.contentEditable = "plaintext-only";
                field.setAttribute("role", "textbox");
            } else {
                field.removeAttribute("contenteditable");
                field.removeAttribute("role");
            }
        }
        entry.querySelector("[data-scene-text]").toggleAttribute("aria-multiline", editable);
    };

    // A blank scene has no actions (3.1); every scene has a slot under it.
    const dress = (entry) => {
        if (!entry.hasAttribute("data-blank")) {
            entry.querySelector(".app-scene-body").insertAdjacentHTML("beforeend", actionsMarkup());
        }
        entry.insertAdjacentHTML("beforeend", slotMarkup());
        setEditable(entry, true);
    };

    const createEntry = ({ name, text, rewriteName, rewriteText, blank = false }) => {
        const entry = document.createElement("li");
        entry.className = "app-scene-entry";
        entry.toggleAttribute("data-blank", blank);
        entry.innerHTML = `
            <article class="app-scene">
                <button type="button" class="app-scene-number" aria-pressed="false" data-scene-number></button>
                <div class="app-scene-body">
                    <div class="app-scene-copy">
                        <p class="app-scene-name" data-scene-name></p>
                        <p class="app-scene-text" data-scene-text></p>
                    </div>
                </div>
            </article>`;
        const scene = entry.querySelector(".app-scene");
        if (rewriteName) Object.assign(scene.dataset, { rewriteName, rewriteText });
        for (const [selector, value] of [["[data-scene-name]", name], ["[data-scene-text]", text]]) {
            const field = entry.querySelector(selector);
            field.textContent = value;
            field.toggleAttribute("data-placeholder-shown", blank);
        }
        dress(entry);
        return entry;
    };

    const renumber = () => {
        entries().forEach((entry, index) => {
            const n = index + 1;
            entry.querySelector(".app-scene").setAttribute("aria-label", `Scene ${n}`);
            const number = entry.querySelector("[data-scene-number]");
            number.textContent = String(n);
            number.setAttribute("aria-label", `Select scene ${n}`);
            entry.querySelector("[data-scene-name]").setAttribute("aria-label", `Scene ${n} title`);
            entry.querySelector("[data-scene-text]").setAttribute("aria-label", `Scene ${n} description`);
        });
    };

    // One scene at a time is selected; pressing its number again lets it go (3.4).
    const select = (chosen) => {
        for (const entry of entries()) {
            const isChosen = entry === chosen;
            entry.toggleAttribute("data-pinned", isChosen);
            entry.querySelector("[data-scene-number]").setAttribute("aria-pressed", String(isChosen));
        }
    };

    const closeBand = ({ returnFocus }) => {
        const open = band();
        if (!open) return;
        const entry = open.closest(".app-scene-entry");
        open.remove();
        entry.querySelector(".app-scene-slot").hidden = false;
        list.removeAttribute("data-suppressed");
        if (returnFocus) entry.querySelector("[data-scene-add]").focus();
    };

    // The Add scene menu, the Continue panel and the drafting rows take the slot's place in
    // turn, in one band under the row (4.2, 4.3).
    const showInBand = (entry, contents) => {
        let open = band();
        if (!open) {
            entry.querySelector(".app-scene-slot").hidden = true;
            entry.insertAdjacentHTML("beforeend", '<div class="app-scene-band" data-scene-band></div>');
            open = band();
            list.setAttribute("data-suppressed", "");
        }
        open.innerHTML = contents;
        return open;
    };

    const openMenu = (entry) => {
        closeBand({ returnFocus: false });
        showInBand(entry, menuMarkup()).querySelector("[data-scene-blank]").focus();
    };

    const openContinue = (entry) => {
        const open = showInBand(entry, continueMarkup());
        open.dataset.count = "1";
        showCount(open);
        open.querySelector("[data-scene-nudge]").focus();
    };

    const countLimit = () => Math.min(CONTINUE_MAX, remaining());

    const showCount = (open) => {
        const count = Number(open.dataset.count);
        open.querySelector("[data-count]").textContent = String(count);
        open.querySelector('[data-count-step="-1"]').disabled = count <= 1;
        open.querySelector('[data-count-step="1"]').disabled = count >= countLimit();
    };

    const stepCount = (open, step) => {
        open.dataset.count = String(Math.min(countLimit(), Math.max(1, Number(open.dataset.count) + step)));
        showCount(open);
    };

    const addBlank = (anchor) => {
        closeBand({ returnFocus: false });
        const entry = createEntry({ ...BLANK_SCENE, blank: true });
        anchor.after(entry);
        renumber();
        select(entry);
        entry.querySelector("[data-scene-name]").focus();
    };

    const continueFrom = async (anchor) => {
        const open = band();
        const count = Number(open.dataset.count);
        const position = entries().indexOf(anchor) + 1;
        open.dataset.busy = "";
        open.setAttribute("role", "status");
        open.innerHTML = draftingMarkup(count, position + 1);
        // The scenes after the anchor show the numbers they will have (4.3).
        for (const later of entries().slice(position)) {
            const number = later.querySelector("[data-scene-number]");
            number.textContent = String(Number(number.textContent) + count);
        }
        if (!(await wait(CONTINUE_MS, signal()))) return;

        closeBand({ returnFocus: false });
        const added = continuations.slice(continued, continued + count).map(({ dataset }) => createEntry(dataset));
        continued += count;
        anchor.after(...added);
        renumber();
        select(added[0]);
        added[0].querySelector("[data-scene-number]").focus();
    };

    const remove = (entry) => {
        const next = entry.nextElementSibling ?? entry.previousElementSibling;
        entry.remove();
        // With no scenes left the panel shows its empty state again, as the app does (6.1).
        if (!next) {
            onEmpty();
            return;
        }
        renumber();
        next.querySelector("[data-scene-number]").focus();
    };

    // While a scene is rewritten, its buttons and text are locked and no other row can
    // start a rewrite (3.4, rewriting).
    const lockRewrite = (entry, locked) => {
        const button = entry.querySelector("[data-scene-rewrite]");
        const label = locked ? "Rewriting scene" : "Rewrite scene";
        button.setAttribute("aria-label", label);
        button.dataset.tip = label;
        button.querySelector("svg").toggleAttribute("hidden", locked);
        button.querySelector(".app-scene-spinner").hidden = !locked;
        entry.querySelector("[data-scene-delete]").disabled = locked;
        for (const other of list.querySelectorAll("[data-scene-rewrite]")) other.disabled = locked;
        setEditable(entry, !locked);
    };

    const rewrite = async (entry) => {
        select(entry);
        lockRewrite(entry, true);
        if (!(await wait(REWRITE_MS, signal()))) return;
        const scene = entry.querySelector(".app-scene");
        const name = entry.querySelector("[data-scene-name]");
        const text = entry.querySelector("[data-scene-text]");
        [name.textContent, scene.dataset.rewriteName] = [scene.dataset.rewriteName, name.textContent];
        [text.textContent, scene.dataset.rewriteText] = [scene.dataset.rewriteText, text.textContent];
        lockRewrite(entry, false);
    };

    list.addEventListener("click", (event) => {
        const entry = event.target.closest(".app-scene-entry");
        if (!entry) return;
        const step = event.target.closest("[data-count-step]");
        if (event.target.closest("[data-scene-number]")) select(entry.hasAttribute("data-pinned") ? null : entry);
        else if (event.target.closest("[data-scene-delete]")) remove(entry);
        else if (event.target.closest("[data-scene-rewrite]")) rewrite(entry);
        else if (event.target.closest("[data-scene-add]")) openMenu(entry);
        else if (event.target.closest("[data-scene-blank]")) addBlank(entry);
        else if (event.target.closest("[data-scene-continue]")) openContinue(entry);
        else if (step) stepCount(band(), Number(step.dataset.countStep));
        else if (event.target.closest("[data-continue-generate]")) continueFrom(entry);
        else if (event.target.closest("[data-scene-cancel]")) closeBand({ returnFocus: true });
    });

    list.addEventListener("keydown", (event) => {
        const open = event.target.closest("[data-scene-band]");
        if (event.key === "Escape" && open && !open.hasAttribute("data-busy")) closeBand({ returnFocus: true });
    });

    // The menu and the Continue panel close when a press or focus lands outside them, as
    // the app's do (4.2). A band that is drafting stays until its scenes arrive.
    const closeFromOutside = (event) => {
        const open = band();
        if (open && !open.hasAttribute("data-busy") && !open.contains(event.target)) closeBand({ returnFocus: false });
    };
    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("focusin", closeFromOutside);

    // A blank scene's placeholder clears when its field is entered and comes back if it is
    // left empty (3.6).
    list.addEventListener("focusin", (event) => {
        const field = event.target.closest("[data-placeholder-shown]");
        if (!field) return;
        field.textContent = "";
        field.removeAttribute("data-placeholder-shown");
    });

    list.addEventListener("focusout", (event) => {
        const field = event.target.closest(".app-scene-entry[data-blank] [data-scene-name], .app-scene-entry[data-blank] [data-scene-text]");
        if (!field || field.textContent.trim() !== "") return;
        field.textContent = field.matches("[data-scene-name]") ? BLANK_SCENE.name : BLANK_SCENE.text;
        field.setAttribute("data-placeholder-shown", "");
    });

    // The scenes as the generation left them, editable and dressed, with every prepared
    // continuation available again.
    return function restore() {
        list.innerHTML = markup;
        list.removeAttribute("data-suppressed");
        continued = 0;
        for (const entry of entries()) dress(entry);
    };
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
    const generateButton = view.querySelector("[data-generate]");
    const restoreScenes = initSceneList(view.querySelector("[data-scene-list]"), view.querySelector("[data-scene-continuations]"), () => run.signal, () => {
        scenes.hidden = true;
        empty.hidden = false;
        hero.setState(view, "empty");
        generateButton.focus();
    });

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

        restoreScenes();
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
        note.hidden = false;
        // A page drafted again in the same visit is the same words, so it is counted once.
        if (!draftCounted) hero.record.add(words);
        draftCounted = true;
        hero.setState(view, "drafted");
    };

    const reset = () => {
        run.abort();
        run = new AbortController();
        note.textContent = "";
        note.hidden = true;
        veil.hidden = true;
        empty.hidden = false;
        scenes.hidden = true;
        draft.hidden = true;
        placeholder.hidden = false;
        view.dataset.panel = "open";
        hero.setState(view, "empty");
    };

    generateButton.addEventListener("click", generateScenes);
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

    // The Scenes panel opens and closes from the header and from its own close button, on
    // the chapter that has one. Only Plan scenes shows one, so from any other page the
    // header's button opens that try with its panel showing.
    const toggleScenes = () => {
        const view = onScreen();
        if (!view.dataset.panel) {
            views.get("plan").dataset.panel = "open";
            select(tabFor("plan"));
            return;
        }
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
