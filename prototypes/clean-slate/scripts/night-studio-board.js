// The Canvas station: story cards joined by labelled links. Each card sits at a fraction
// of the board's free space (--x and --y, 0 to 1), so the layout holds at any width.
// With a mouse or the arrow keys a card moves and its links are redrawn.
const board = document.querySelector("[data-board]");
const cards = new Map(
    Array.from(board.querySelectorAll("[data-card]"), (card) => [card.dataset.card, card]),
);
const links = Array.from(board.querySelectorAll("[data-link]"));
const finePointer = window.matchMedia("(pointer: fine)");

const KEY_STEP = 0.05;
const KEY_DIRECTIONS = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
};

function centreOf(card) {
    return {
        x: card.offsetLeft + card.offsetWidth / 2,
        y: card.offsetTop + card.offsetHeight / 2,
    };
}

function drawLinks() {
    for (const link of links) {
        const from = centreOf(cards.get(link.dataset.from));
        const to = centreOf(cards.get(link.dataset.to));
        const line = link.querySelector("line");
        const label = link.querySelector("text");

        line.setAttribute("x1", from.x);
        line.setAttribute("y1", from.y);
        line.setAttribute("x2", to.x);
        line.setAttribute("y2", to.y);
        label.setAttribute("x", (from.x + to.x) / 2);
        label.setAttribute("y", (from.y + to.y) / 2);
    }

    board.classList.add("is-drawn");
}

function withinBoard(fraction) {
    return Math.min(1, Math.max(0, fraction));
}

function moveCard(card, x, y) {
    card.style.setProperty("--x", withinBoard(x));
    card.style.setProperty("--y", withinBoard(y));
    drawLinks();
}

function dragCard(event) {
    const card = event.currentTarget;
    const freeWidth = board.clientWidth - card.offsetWidth;
    const freeHeight = board.clientHeight - card.offsetHeight;
    const grabX = event.clientX - card.offsetLeft;
    const grabY = event.clientY - card.offsetTop;

    const follow = (moveEvent) => {
        moveCard(
            card,
            (moveEvent.clientX - grabX) / freeWidth,
            (moveEvent.clientY - grabY) / freeHeight,
        );
    };

    card.setPointerCapture(event.pointerId);
    card.classList.add("is-held");
    card.addEventListener("pointermove", follow);
    card.addEventListener(
        "lostpointercapture",
        () => {
            card.removeEventListener("pointermove", follow);
            card.classList.remove("is-held");
        },
        { once: true },
    );
}

function nudgeCard(event) {
    const direction = KEY_DIRECTIONS[event.key];
    if (!direction) return;

    event.preventDefault();
    const card = event.currentTarget;
    const position = getComputedStyle(card);
    moveCard(
        card,
        Number(position.getPropertyValue("--x")) + direction.x * KEY_STEP,
        Number(position.getPropertyValue("--y")) + direction.y * KEY_STEP,
    );
}

for (const card of cards.values()) {
    card.addEventListener("keydown", nudgeCard);
    if (finePointer.matches) card.addEventListener("pointerdown", dragCard);
}

// Also draws the links for the first time: an observer reports once when it starts.
new ResizeObserver(drawLinks).observe(board);
