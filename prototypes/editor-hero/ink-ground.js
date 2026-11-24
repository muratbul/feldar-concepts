// The ground under the sample editor: a ruled manuscript page of the sample book, written
// out by hand. The window lies on the page, so only its margins and the lines under it
// show. The page is the chapter The Ledger and the opening of Pryce's Gate, word for word
// as the sample book has them, and the author rings a word in a margin. Under the window
// is the paragraph of The Ledger that the app rewrote with Deepen description: Feldar's
// three phrases arrive in blue above the line, the author strikes one out and the other
// two settle into the ink. The hand, its size, the line spacing and the inks are custom
// properties set on the canvas by the stylesheet.

const PAGE = [
    "The ledger was in the bottom drawer of the bureau, under a seed catalogue from 1958 and a tin of the mints her father had sucked for his chest. It was bound in green cloth gone black at the corners, and it fell open, as she had known it would, at the last page he had used.",
    "His hand had not changed in thirty years. The same upright figures, the same small flourish on every four, the same habit of pressing so hard at the foot of a column that the total stood up from the paper like braille. Feed for the ewes. Two new ladders. Sixpence for the boy who came about the wasps.",
    "Nell turned back a year, then ten. The orchard had been losing money since before she left for Bristol, a little each season, the way a tree loses ground to canker: nothing you could point to, and then a limb on the grass one morning.",
    "But it was the other column that held her. On the first of every month, beneath the rates and the wages and the price of sulphur, he had written the same two letters and the same sum. M.P. Two pounds. It ran back through the bad winters and the good ones, through the year of the flood and the year her mother died, as steady as a pulse.",
    "Two pounds was what he paid the pickers for a week. Two pounds was the coat she had wanted at fourteen and not been given, because, he said, there was no money for coats that year.",
    '"Who were you paying?" she said to the page, and was ashamed of how loud it sounded in the empty house.',
    "In the morning she would walk down to the cider house and ask Daniel Pryce, who had worked for her father since the war, and who would know, and who would look at the ground when he answered.",
    "The lane was white by eight o'clock, and Nell walked down the middle of it where the cart tracks had frozen into ridges, her father's ledger buttoned inside her coat like something that might get away.",
    "Daniel was in the cider house, as she had known he would be, rolling the empty casks into a line along the wall. He did not stop when she came in. He said it was a hard frost, and that it would be harder tonight, and that the Foxwhelps in the bottom rows would feel it first.",
    "She took out the ledger and opened it on the press between them, at the column of two pounds, and waited.",
    "He looked at the page for a long time without touching it. Then he wiped his hands on the sack tied round his waist, slowly, one finger at a time, as if there were a great deal of cider on them and he meant to have every drop.",
];

// The paragraph as the author wrote it, and the three phrases the app's Deepen
// description rewrite adds to it, each placed after the words it follows.
const REVISED = {
    text: "She sat with the book open on her knees while the kitchen clock went on with its business. Outside, the frost was already coming down over the Lugg meadows, silvering the grass between the rows, and the old trees stood in it with their arms raised, as if someone had asked them a question.",
    insertions: [
        { after: "went on with its business", words: "loud in the way clocks are only loud in an empty house", kept: true },
        { after: "silvering the grass between the rows", words: "and stiffening the last windfalls where they lay", kept: false },
        { after: "with their arms raised,", words: "black against a sky the colour of pewter", kept: true },
    ],
};

// Words worth a ring, best first. The first one that shows in a margin is ringed.
const RING_WORDS = ["M.P.", "braille.", "Bristol,", "canker:", "Foxwhelps", "1958", "sulphur,", "wasps."];

const EDGE = 24;
// Less margin than this beside the window would show only the edges of letters, so the
// page there is left as ruled lines.
const MIN_MARGIN_TEXT = 40;
const INDENT_EM = 2;
const INSERTION_SCALE = 0.86;
const PEN_PX_PER_MS = 0.8;
const SMALL_PEN_PX_PER_MS = 0.45;
const LINE_DELAY_MS = 90;
const BAND_PAUSE_MS = 160;
const MARK_DELAY_MS = 500;
const RING_MS = 520;
const CARET_MS = 160;
const STRIKE_MS = 340;
const SETTLE_MS = 1260;
const MAX_PIXEL_RATIO = 2;
const TURN = Math.PI * 2;
const SEED = 1932;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const clamp01 = (value) => Math.min(1, Math.max(0, value));

// A small seeded generator, so a pen's wobble is the same on every visit.
function seededRandom(seed) {
    let state = seed;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
        mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
}

// Sets paragraphs into the given lines word by word, each paragraph from a new indented
// line. A word keeps its place in its paragraph so that a mark can find it.
function setLines(context, paragraphs, slots, indent) {
    const space = context.measureText(" ").width;
    const lines = [];

    for (const text of paragraphs) {
        let line = null;
        let offset = 0;
        for (const word of text.split(" ")) {
            const start = text.indexOf(word, offset);
            const width = context.measureText(word).width;
            offset = start + word.length;

            if (line && line.right + space + width <= line.limit) {
                line.words.push({ text: word, x: line.right + space, width, start });
                line.right += space + width;
                continue;
            }
            const slot = slots[lines.length];
            if (!slot) return lines;
            const x = slot.from + (line ? 0 : indent);
            line = { baseline: slot.baseline, left: x, right: x + width, limit: slot.to, words: [{ text: word, x, width, start }] };
            lines.push(line);
        }
    }
    return lines;
}

// A ring around a word, drawn a little past where it began, as a pen closes one.
function ringAround(random, word, baseline, size) {
    const points = [];
    const start = random() * TURN;
    for (let step = 0; step <= 40; step += 1) {
        const angle = start + (step / 40) * TURN * 1.08;
        const wobble = 1 + (random() - 0.5) * 0.06;
        points.push({
            x: word.x + word.width / 2 + Math.cos(angle) * (word.width / 2 + 9) * wobble,
            y: baseline - size * 0.35 + Math.sin(angle) * size * 0.95 * wobble,
        });
    }
    return points;
}

// A line struck through a run of words, not quite straight.
function strikeThrough(random, run, size) {
    const points = [];
    for (let step = 0; step <= 16; step += 1) {
        const along = step / 16;
        points.push({
            x: run.left - 4 + along * (run.right - run.left + 8),
            y: run.baseline - size * 0.32 + Math.sin(along * TURN) * 0.9 + (random() - 0.5) * 0.6,
        });
    }
    return points;
}

function composeScene(context, hand, box) {
    const { gap, size } = hand;
    const smallSize = size * INSERTION_SCALE;
    const random = seededRandom(SEED);
    context.font = hand.font;
    const { actualBoundingBoxAscent: ascent, actualBoundingBoxDescent: descent } = context.measureText("Hgy");

    // One grid of lines for the whole page, set from the first line under the window so
    // that the lines there sit a line and a half below its edge.
    const firstUnder = box.stageBottom + Math.round(gap * 1.5);
    const hasMargins = box.stageLeft - EDGE >= MIN_MARGIN_TEXT;
    const rules = [];
    const pageSlots = [];
    const bandSlots = [];
    for (let baseline = firstUnder % gap; baseline < box.height; baseline += gap) {
        rules.push(baseline + 3.5);
        if (baseline - ascent < 0 || baseline + descent > box.height) continue;

        const slot = { baseline, from: EDGE, to: box.width - EDGE };
        if (baseline >= firstUnder) bandSlots.push(slot);
        // A line under the window is written either fully above its top edge or fully
        // below it, so that no half-hidden letters show along the edge.
        else if (hasMargins && baseline + descent <= box.stageBottom - 2 && (baseline - ascent >= box.stageTop + 2 || baseline + descent <= box.stageTop - 2)) pageSlots.push(slot);
    }

    const indent = size * INDENT_EM;
    const pageLines = setLines(context, PAGE, pageSlots, indent);
    const bandLines = setLines(context, [REVISED.text], bandSlots, indent);

    // The page is written from the top, each line a little after the one above, at the
    // pace of one pen. The lines under the window come one after another.
    for (const [index, line] of pageLines.entries()) {
        line.start = index * LINE_DELAY_MS;
        line.duration = (line.right - line.left) / PEN_PX_PER_MS;
    }
    let bandTime = 0;
    for (const line of bandLines) {
        line.start = bandTime;
        line.duration = (line.right - line.left) / PEN_PX_PER_MS;
        bandTime += line.duration + BAND_PAUSE_MS;
    }

    const isShown = (word, line) => {
        const besideWindow = line.baseline + descent > box.stageTop && line.baseline - ascent < box.stageBottom;
        return !besideWindow || word.x + word.width + 14 < box.stageLeft || word.x - 14 > box.stageRight;
    };
    let ring = null;
    for (const candidate of RING_WORDS) {
        const line = pageLines.find((pageLine) => pageLine.words.some((word) => word.text === candidate && isShown(word, pageLine)));
        if (!line) continue;
        const word = line.words.find((lineWord) => lineWord.text === candidate && isShown(lineWord, line));
        ring = {
            points: ringAround(random, word, line.baseline, size),
            start: line.start + (word.x + word.width - line.left) / PEN_PX_PER_MS + MARK_DELAY_MS,
        };
        break;
    }

    const insertions = [];
    bandTime += MARK_DELAY_MS;
    for (const { after, words, kept } of REVISED.insertions) {
        const anchor = REVISED.text.indexOf(after) + after.length;
        const line = bandLines.find((bandLine) => bandLine.words.some((word) => word.start < anchor && anchor <= word.start + word.text.length));
        if (!line) continue;

        context.font = hand.font;
        const word = line.words.find((lineWord) => lineWord.start < anchor && anchor <= lineWord.start + lineWord.text.length);
        const caretX = word.x + context.measureText(word.text.slice(0, anchor - word.start)).width;
        context.font = hand.smallFont;
        const width = context.measureText(words).width;
        const previous = insertions.at(-1);
        let left = Math.min(caretX - 6, box.width - EDGE - width);
        if (previous && previous.line === line) left = Math.max(left, previous.right + 14);

        const caretAt = bandTime;
        const start = caretAt + CARET_MS;
        const duration = width / SMALL_PEN_PX_PER_MS;
        insertions.push({
            line,
            kept,
            caretAt,
            start,
            duration,
            baseline: line.baseline - gap * 0.52,
            left,
            right: left + width,
            words: [{ text: words, x: left }],
            caret: [
                { x: caretX - 4, y: line.baseline + 7 },
                { x: caretX, y: line.baseline + 1 },
                { x: caretX + 4, y: line.baseline + 7 },
            ],
        });
        bandTime = start + duration + 250;
    }

    const struck = insertions.find((insertion) => !insertion.kept);
    const strike = struck && { points: strikeThrough(random, struck, smallSize), start: bandTime + 600 };
    const settleAt = strike ? strike.start + STRIKE_MS + 400 : bandTime;
    const pageEnds = pageLines.map((line) => line.start + line.duration);

    return {
        width: box.width,
        height: box.height,
        rules,
        pageLines,
        bandLines,
        ring,
        insertions,
        strike,
        settleAt,
        bandTop: firstUnder,
        pageEnd: Math.max(0, ...pageEnds, ring ? ring.start + RING_MS : 0),
        bandEnd: bandLines.length ? settleAt + SETTLE_MS : 0,
    };
}

// Writes a run of words as far as the pen has got along it.
function writeRun(context, run, elapsed, gap) {
    const progress = clamp01((elapsed - run.start) / run.duration);
    if (progress === 0) return;

    context.save();
    if (progress < 1) {
        context.beginPath();
        context.rect(0, run.baseline - gap, run.left + (run.right - run.left) * progress, gap * 1.6);
        context.clip();
    }
    for (const word of run.words) context.fillText(word.text, word.x, run.baseline);
    context.restore();
}

function traceStroke(context, points, progress) {
    const reached = Math.ceil(clamp01(progress) * (points.length - 1));
    if (reached === 0) return;

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1, reached + 1)) context.lineTo(point.x, point.y);
    context.stroke();
}

function drawScene(context, scene, hand, inks, pageElapsed, bandElapsed) {
    const { gap } = hand;
    context.clearRect(0, 0, scene.width, scene.height);

    context.strokeStyle = inks.rule;
    context.lineWidth = 1;
    context.beginPath();
    for (const y of scene.rules) {
        context.moveTo(0, y);
        context.lineTo(scene.width, y);
    }
    context.stroke();

    context.font = hand.font;
    context.fillStyle = inks.hand;
    for (const line of scene.pageLines) writeRun(context, line, pageElapsed, gap);
    for (const line of scene.bandLines) writeRun(context, line, bandElapsed, gap);

    context.strokeStyle = inks.author;
    context.lineWidth = 1.2;
    if (scene.ring) traceStroke(context, scene.ring.points, (pageElapsed - scene.ring.start) / RING_MS);

    // A kept phrase goes from Feldar's blue into the author's ink, as accepted text does
    // in the app.
    const settled = clamp01((bandElapsed - scene.settleAt) / SETTLE_MS);
    context.font = hand.smallFont;
    context.lineWidth = 1.1;
    for (const insertion of scene.insertions) {
        const share = insertion.kept ? settled : 0;
        for (const [ink, alpha] of [
            [inks.mark, 1 - share],
            [inks.hand, share],
        ]) {
            if (alpha === 0) continue;
            context.globalAlpha = alpha;
            context.fillStyle = ink;
            context.strokeStyle = ink;
            traceStroke(context, insertion.caret, (bandElapsed - insertion.caretAt) / CARET_MS);
            writeRun(context, insertion, bandElapsed, gap);
        }
        context.globalAlpha = 1;
    }

    if (!scene.strike) return;
    context.strokeStyle = inks.author;
    context.lineWidth = 1.3;
    traceStroke(context, scene.strike.points, (bandElapsed - scene.strike.start) / STRIKE_MS);
}

export async function paintInkGround(canvas, stage) {
    const context = canvas.getContext("2d");
    const styles = getComputedStyle(canvas);
    const property = (name) => styles.getPropertyValue(name).trim();
    const size = parseFloat(property("--ground-size"));
    const weight = property("--ground-weight");
    const family = property("--ground-face");
    const hand = {
        size,
        gap: parseFloat(property("--ground-line")),
        font: `${weight} ${size}px ${family}`,
        smallFont: `${weight} ${size * INSERTION_SCALE}px ${family}`,
    };
    const inks = {
        rule: property("--ground-rule"),
        hand: property("--ground-hand"),
        author: property("--ground-author"),
        mark: property("--ground-mark"),
    };
    let scene = null;
    let laidOutAt = "";
    let pageStart = 0;
    let bandStart = null;
    let frame = 0;

    // Without the hand the page is still written, in the fallback face, so a missing
    // font changes the look and nothing else.
    await Promise.allSettled([document.fonts.load(hand.font), document.fonts.load(hand.smallFont)]);

    const layOut = () => {
        const bounds = canvas.getBoundingClientRect();
        const stageBounds = stage.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
        canvas.width = Math.round(bounds.width * ratio);
        canvas.height = Math.round(bounds.height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.lineCap = "round";
        context.lineJoin = "round";
        scene = composeScene(context, hand, {
            width: bounds.width,
            height: bounds.height,
            stageLeft: stageBounds.left - bounds.left,
            stageRight: stageBounds.right - bounds.left,
            stageTop: stageBounds.top - bounds.top,
            stageBottom: stageBounds.bottom - bounds.top,
        });
    };

    const tick = () => {
        const now = performance.now();
        const pageElapsed = now - pageStart;
        const bandElapsed = bandStart === null ? -Infinity : now - bandStart;
        drawScene(context, scene, hand, inks, pageElapsed, bandElapsed);
        const writing = pageElapsed < scene.pageEnd || (bandStart !== null && bandElapsed < scene.bandEnd);
        frame = writing ? requestAnimationFrame(tick) : 0;
    };

    // The lines under the window are written once they come into view, not before.
    const watchBand = () => {
        if (canvas.getBoundingClientRect().top + scene.bandTop > window.innerHeight) return;
        window.removeEventListener("scroll", watchBand);
        bandStart = performance.now();
        if (!frame) frame = requestAnimationFrame(tick);
    };

    // The page is written once. When the desk changes size it is set down again whole.
    new ResizeObserver(() => {
        const nextSize = `${canvas.clientWidth}x${canvas.clientHeight}`;
        if (nextSize === laidOutAt) return;
        const isFirst = laidOutAt === "";
        laidOutAt = nextSize;
        cancelAnimationFrame(frame);
        frame = 0;
        layOut();

        if (!isFirst || reducedMotion.matches) {
            window.removeEventListener("scroll", watchBand);
            drawScene(context, scene, hand, inks, Infinity, Infinity);
            return;
        }
        pageStart = performance.now();
        frame = requestAnimationFrame(tick);
        window.addEventListener("scroll", watchBand, { passive: true });
        watchBand();
    }).observe(canvas);
}
