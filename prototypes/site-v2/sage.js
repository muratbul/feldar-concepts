// Sage on the sample page. Each moment is prepared in the markup; this script moves it
// along the way the app does (docs/seo/app-ui/production-sage-spec.md). Nothing is sent.

// 2.7: a saying is spoken a word at a time, the first after 160ms, then every 90ms.
const SAY_FIRST_MS = 160;
const SAY_WORD_MS = 90;
// The status shows while Sage reads, then the answer streams in.
const READING_MS = 1600;
const ANSWER_WORD_MS = 26;
const FIELD_MAX_HEIGHT = 120;
// 4.3, Read this page: Sage walks to a reaction, and its mark appears once Sage is there.
const WALK_DELAY_MS = 300;
const WALK_MS = 720;
// Sage's tip rests on the mark's lower right corner: 4px in from its right edge, 2px up.
const MARK_SIZE = 24;
const TIP_INSET = { x: 4, y: 2 };
// Sage's body box reaches 24px right of its point, and a bubble below it sits 33px down (2.5).
const BODY_RIGHT = 24;
const BUBBLE_BELOW = 33;
// The bubble keeps this far inside the page's right edge.
const PAGE_EDGE_GAP = 8;
// Under the text, Sage's point sits 32px in and 19px below the last line (2.5).
const UNDER = { x: 32, y: 19 };
// 3.1: past one line the field squares its corners.
const FIELD_TALL_PX = 28;

const ANSWER =
    "She wants Daniel to explain the payments to M.P., two pounds on the first of every month since 1932, so she lays the column in front of him and waits. (“Pryce’s Gate”, page 1)";
const SAMPLE_ENDS =
    "That is all I know about this sample book. Start writing free and ask me about your own.";

const STATUS = {
    ask: {
        asking: "A question is waiting for Sage. Press Send.",
        reading: "Sage is reading the page.",
        answered: "Sage answered beside the page, and named the page it read.",
    },
    follow: {
        left: "Sage read along and left a reaction in the margin. Press it.",
        open: "Sage's reaction to the line. Done clears it from the margin.",
        done: "Done. The margin is clean again.",
    },
    memories: {
        menu: "Right-click Sage for its menu. Memories opens what Sage remembers, in Settings.",
    },
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const pause = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, reducedMotion.matches ? 0 : milliseconds));

// Stops early, leaving what it has said, once isCurrent says the moment has moved on.
async function speak(target, text, firstMs, wordMs, isCurrent = () => true) {
    target.textContent = "";
    if (reducedMotion.matches) {
        target.textContent = text;
        return;
    }
    await pause(firstMs);
    for (const word of text.match(/\s*\S+\s*/g) ?? []) {
        if (!isCurrent()) return;
        target.append(word);
        await pause(wordMs);
    }
}

function fitField(input) {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, FIELD_MAX_HEIGHT)}px`;
    input.closest("[data-sage-form]").toggleAttribute("data-tall", input.offsetHeight > FIELD_TALL_PX);
}

function initAsk(view, setState) {
    const form = view.querySelector("[data-sage-form]");
    const input = view.querySelector("[data-sage-input]");
    const send = view.querySelector("[data-sage-send]");
    const voice = view.querySelector("[data-sage-voice]");
    const status = view.querySelector("[data-sage-status]");
    const answer = view.querySelector("[data-sage-answer]");
    const answerText = view.querySelector("[data-sage-answer-text]");
    const saying = view.querySelector("[data-sage-saying]");
    const actions = view.querySelector("[data-sage-actions]");
    const row = form.parentElement;
    const question = input.value;
    // Start again during an answer ends that run; a run checks it is still current after each wait.
    let run = 0;

    // 3.3: an empty field offers dictation, a field with words in it offers Send.
    const showSendOrVoice = () => {
        const empty = input.value.trim() === "";
        send.hidden = empty;
        voice.hidden = !empty;
        fitField(input);
    };

    input.addEventListener("input", showSendOrVoice);
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            form.requestSubmit();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (input.value.trim() === "") return;

        if (view.dataset.state === "answered") {
            input.value = "";
            showSendOrVoice();
            saying.hidden = false;
            await speak(saying, SAMPLE_ENDS, SAY_FIRST_MS, SAY_WORD_MS);
            return;
        }

        const thisRun = ++run;
        setState("reading");
        row.hidden = true;
        status.hidden = false;
        await pause(READING_MS);
        if (thisRun !== run) return;
        status.hidden = true;
        answer.hidden = false;
        await speak(answerText, ANSWER, 0, ANSWER_WORD_MS, () => thisRun === run);
        if (thisRun !== run) return;
        input.value = "";
        input.placeholder = "Follow up";
        showSendOrVoice();
        actions.hidden = false;
        row.hidden = false;
        setState("answered");
    });

    view.querySelector("[data-sage-copy]").addEventListener("click", () => navigator.clipboard.writeText(ANSWER));

    return () => {
        run += 1;
        input.value = question;
        input.placeholder = "Ask Sage anything";
        for (const part of [status, answer, saying, actions]) part.hidden = true;
        answerText.textContent = "";
        row.hidden = false;
        showSendOrVoice();
        setState("asking");
    };
}

function initFollow(view, column, setState) {
    const mark = view.querySelector("[data-sage-mark]");
    const card = view.querySelector("[data-sage-card]");
    const walker = view.querySelector("[data-sage-walker]");
    const saying = view.querySelector("[data-sage-follow-saying]");
    const about = column.querySelector("[data-sage-about]");
    const prose = column.querySelector(".sg-prose");
    const line = saying.textContent;
    // Leaving the mode or starting again ends a walk; a walk checks it is still current.
    let walk = 0;

    const columnTop = () => column.getBoundingClientRect().top;

    // 4.1: the mark sits 8px right of the column, on the line it is about, centred on a line
    // up to 24px tall. Returns where Sage's tip rests on it.
    const placeMark = () => {
        const lineBox = about.getClientRects()[0];
        const top = Math.round(lineBox.top - columnTop() + Math.min(lineBox.height, MARK_SIZE) / 2 - MARK_SIZE / 2);
        column.style.setProperty("--sg-mark-top", `${top}px`);
        return { x: column.clientWidth + 8 + MARK_SIZE - TIP_INSET.x, y: top + MARK_SIZE - TIP_INSET.y };
    };

    const underText = () => ({ x: UNDER.x, y: prose.getBoundingClientRect().bottom - columnTop() + UNDER.y });

    const moveWalker = ({ x, y }) => {
        walker.style.setProperty("--walk-x", `${x}px`);
        walker.style.setProperty("--walk-y", `${y}px`);
    };

    // The bubble lines up with Sage's body box, but never runs past the page's edge, which
    // on a phone is close to the margin.
    const placeSaying = ({ x, y }) => {
        const pageRight = column.closest(".sg-page").getBoundingClientRect().right - column.getBoundingClientRect().left - PAGE_EDGE_GAP;
        saying.style.setProperty("--say-x", `${Math.min(x + BODY_RIGHT, pageRight)}px`);
        saying.style.setProperty("--say-y", `${y + BUBBLE_BELOW}px`);
    };

    const arrive = (point, thisWalk) => {
        mark.hidden = false;
        placeSaying(point);
        saying.hidden = false;
        speak(saying, line, SAY_FIRST_MS, SAY_WORD_MS, () => thisWalk === walk);
    };

    const enter = async () => {
        if (view.dataset.state !== "left") return;
        const thisWalk = ++walk;
        const target = placeMark();
        mark.hidden = true;
        saying.hidden = true;
        walker.classList.remove("is-walking");
        if (reducedMotion.matches) {
            moveWalker(target);
            arrive(target, thisWalk);
            return;
        }
        moveWalker(underText());
        await pause(WALK_DELAY_MS);
        if (thisWalk !== walk) return;
        walker.classList.add("is-walking");
        moveWalker(target);
        await pause(WALK_MS);
        if (thisWalk !== walk) return;
        walker.classList.remove("is-walking");
        arrive(target, thisWalk);
    };

    const setOpen = (open) => {
        card.hidden = !open;
        mark.setAttribute("aria-expanded", String(open));
        if (open) {
            mark.removeAttribute("data-unseen");
            saying.hidden = true;
        }
        setState(open ? "open" : "left");
    };

    mark.addEventListener("click", () => setOpen(card.hidden));
    view.querySelector("[data-sage-done]").addEventListener("click", () => {
        setOpen(false);
        mark.hidden = true;
        setState("done");
    });

    // Once Sage is at the mark, a change of width moves both with the line.
    new ResizeObserver(() => {
        const target = placeMark();
        if (walker.classList.contains("is-walking") || mark.hidden) return;
        moveWalker(target);
        placeSaying(target);
    }).observe(column);

    const reset = () => {
        walk += 1;
        setOpen(false);
        mark.setAttribute("data-unseen", "");
        enter();
    };

    return { enter, reset };
}

export function initSage(root) {
    const tabs = [...root.querySelectorAll("[data-sage-mode]")];
    const views = new Map([...root.querySelectorAll("[data-sage-view]")].map((view) => [view.dataset.sageView, view]));
    const column = root.querySelector("[data-sage-column]");
    const statusLine = root.querySelector("[data-sage-status-line]");
    const resetButton = root.querySelector("[data-sage-reset]");
    const firstStates = new Map([...views].map(([mode, view]) => [mode, view.dataset.state]));
    let mode = tabs.find((tab) => tab.getAttribute("aria-selected") === "true").dataset.sageMode;

    const showState = () => {
        const view = views.get(mode);
        statusLine.textContent = STATUS[mode][view.dataset.state ?? "menu"];
        resetButton.hidden = view.dataset.state === firstStates.get(mode);
    };

    const stateSetter = (view) => (state) => {
        view.dataset.state = state;
        showState();
    };

    const follow = initFollow(views.get("follow"), column, stateSetter(views.get("follow")));
    const resets = {
        ask: initAsk(views.get("ask"), stateSetter(views.get("ask"))),
        follow: follow.reset,
        memories: () => {},
    };

    const select = (tab) => {
        mode = tab.dataset.sageMode;
        for (const other of tabs) {
            const selected = other === tab;
            other.setAttribute("aria-selected", String(selected));
            other.tabIndex = selected ? 0 : -1;
        }
        for (const [name, view] of views) view.hidden = name !== mode;
        if (mode === "follow") follow.enter();
        showState();
    };

    for (const tab of tabs) tab.addEventListener("click", () => select(tab));
    tabs[0].parentElement.addEventListener("keydown", (event) => {
        const move = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
        if (!move) return;
        event.preventDefault();
        const next = tabs[(tabs.indexOf(document.activeElement) + move + tabs.length) % tabs.length];
        next.focus();
        select(next);
    });

    resetButton.addEventListener("click", () => {
        resets[mode]();
        showState();
    });

    fitField(root.querySelector("[data-sage-input]"));
    showState();
}
