// Concept B, "Index cards": the menu, the ticker, the things on the desk, and the rail.
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
// Props only overlap the app window, and so can only be moved, on the wide layout.
const deskLayout = window.matchMedia("(min-width: 961px)");
const SLIP_STATE_AFTER = { accept: "accepted", dismiss: "dismissed", reset: "suggested" };

function wireMenu() {
    const nav = document.querySelector("[data-nav]");
    const toggle = nav.querySelector("[data-nav-toggle]");

    toggle.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
    });
}

// The list is doubled so the loop has no seam; the copy is hidden from screen readers.
function startTicker() {
    if (reducedMotion.matches) return;

    const track = document.querySelector("[data-ticker]");
    const repeat = track.firstElementChild.cloneNode(true);
    repeat.setAttribute("aria-hidden", "true");
    track.append(repeat);
    track.classList.add("is-running");
}

function wireSlip() {
    const slip = document.querySelector("[data-slip]");
    const variants = Array.from(slip.querySelectorAll("[data-slip-variant]"));

    slip.addEventListener("click", (event) => {
        const button = event.target.closest("[data-slip-action]");
        if (!button) return;

        const action = button.dataset.slipAction;
        if (action === "revise") {
            for (const variant of variants) variant.hidden = !variant.hidden;
            return;
        }

        slip.dataset.state = SLIP_STATE_AFTER[action];
    });
}

// Mouse only, so a finger on a card still scrolls the page.
function wireDeskDragging() {
    const desk = document.querySelector("[data-desk]");
    const droppedAt = new WeakMap();

    desk.addEventListener("pointerdown", (event) => {
        const prop = event.target.closest("[data-drag]");
        if (!prop || event.pointerType !== "mouse" || event.button !== 0) return;
        if (!deskLayout.matches || event.target.closest("button")) return;

        event.preventDefault();
        const origin = droppedAt.get(prop) ?? { x: 0, y: 0 };
        const shift = { ...origin };

        const follow = (moveEvent) => {
            shift.x = origin.x + moveEvent.clientX - event.clientX;
            shift.y = origin.y + moveEvent.clientY - event.clientY;
            prop.style.setProperty("--ic-shift-x", `${shift.x}px`);
            prop.style.setProperty("--ic-shift-y", `${shift.y}px`);
        };

        const drop = () => {
            droppedAt.set(prop, shift);
            prop.classList.remove("is-held");
            prop.removeEventListener("pointermove", follow);
        };

        prop.setPointerCapture(event.pointerId);
        prop.classList.add("is-held");
        prop.addEventListener("pointermove", follow);
        prop.addEventListener("pointerup", drop, { once: true });
        prop.addEventListener("pointercancel", drop, { once: true });
    });
}

function wireRail() {
    const rail = document.querySelector("[data-rail]");
    const previous = document.querySelector('[data-rail-step="-1"]');
    const next = document.querySelector('[data-rail-step="1"]');

    const updateButtons = () => {
        previous.disabled = rail.scrollLeft <= 1;
        next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 1;
    };

    for (const button of [previous, next]) {
        button.addEventListener("click", () => {
            const stride = rail.firstElementChild.offsetWidth + parseFloat(getComputedStyle(rail).columnGap);
            rail.scrollBy({
                left: Number(button.dataset.railStep) * stride,
                behavior: reducedMotion.matches ? "auto" : "smooth",
            });
        });
    }

    rail.addEventListener("scroll", updateButtons, { passive: true });
    updateButtons();
}

// Loops run only while on screen. Readers who ask for reduced motion get the poster
// frame and the browser's own controls instead.
function playLoopsInView() {
    const loops = document.querySelectorAll("video[data-loop]");

    if (reducedMotion.matches) {
        for (const loop of loops) loop.controls = true;
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) {
                    entry.target.pause();
                    continue;
                }
                // play() rejects when a scroll interrupts it; the next crossing retries.
                entry.target.play().catch(() => undefined);
            }
        },
        { threshold: 0.6 },
    );

    for (const loop of loops) observer.observe(loop);
}

wireMenu();
startTicker();
wireSlip();
wireDeskDragging();
wireRail();
playLoopsInView();
