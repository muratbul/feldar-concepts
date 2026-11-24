// The ground under the sample editor: a ruled manuscript page. A hand writes across its
// lines once, from the left, and a second pen then marks a few words. None of it is a
// real script. The inks are custom properties set on the canvas by the stylesheet, and
// the area under the stage is left unwritten because nothing shows there.

const LINE_GAP = 34;
const X_HEIGHT = 6;
const SLANT = 0.28;
const SAMPLES = 12;
const EDGE = 28;
const SHORTEST_RUN = 72;
const LINE_MS = 2200;
const LINE_DELAY_MS = 70;
const MARK_DELAY_MS = 450;
const MARKS = 7;
const MAX_PIXEL_RATIO = 2;
const TURN = Math.PI * 2;
const SEED = 1932;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// A small seeded generator, so the same page is written on every visit and every resize.
function seededRandom(seed) {
    let state = seed;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
        mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
}

// One word of joined-up hand. Each letter is a single turn of the pen that leaves the
// baseline and comes back to it: a low turn reads as an e or an n, a tall one as an l,
// and one that drops under the line as a g.
function writeWord(random, left, baseline, size) {
    const points = [];
    const letters = 2 + Math.floor(random() * 6);
    let x = left;

    for (let letter = 0; letter < letters; letter += 1) {
        const kind = random();
        const reach = kind < 0.2 ? 2.2 : kind > 0.9 ? -1.5 : 0.8 + random() * 0.4;
        const width = size * (1 + random() * 0.6);
        const loop = 0.5 + random() * 0.9;

        for (let sample = letter === 0 ? 0 : 1; sample <= SAMPLES; sample += 1) {
            const angle = (sample / SAMPLES) * TURN;
            const rise = ((1 - Math.cos(angle)) / 2) * reach * size;
            points.push({
                x: x + (width * (angle - loop * Math.sin(angle))) / TURN + rise * SLANT,
                y: baseline - rise,
            });
        }
        x += width;
    }

    return { points, left, right: x, baseline };
}

// A line of words between two edges. Now and then it starts in from the edge or stops
// short, as the first and last lines of a paragraph do.
function writeLine(random, baseline, from, to) {
    const words = [];
    const end = random() < 0.22 ? from + (to - from) * (0.4 + random() * 0.4) : to;
    let x = from + (random() < 0.15 ? LINE_GAP : 0);

    while (x < end - 5 * X_HEIGHT) {
        const word = writeWord(random, x, baseline, X_HEIGHT);
        words.push(word);
        x = word.right + X_HEIGHT * (1.4 + random());
    }
    return words;
}

// What the second pen does to a word: strikes it out and writes another above it, rings
// it, or underlines it.
function markWord(random, word, kind) {
    const middle = word.baseline - X_HEIGHT / 2;

    if (kind === "ring") {
        const start = random() * TURN;
        const points = [];
        for (let sample = 0; sample <= 2 * SAMPLES; sample += 1) {
            const angle = start + (sample / (2 * SAMPLES)) * TURN * 1.08;
            const wobble = 1 + (random() - 0.5) * 0.08;
            points.push({
                x: (word.left + word.right) / 2 + Math.cos(angle) * ((word.right - word.left) / 2 + 6) * wobble,
                y: middle + Math.sin(angle) * X_HEIGHT * 2.1 * wobble,
            });
        }
        return [points];
    }

    const y = kind === "strike" ? middle : word.baseline + 4;
    const line = [];
    for (let sample = 0; sample <= SAMPLES; sample += 1) {
        const along = sample / SAMPLES;
        line.push({ x: word.left - 3 + along * (word.right - word.left + 6), y: y + Math.sin(along * TURN) * 0.8 });
    }
    if (kind === "underline") return [line];
    return [line, writeWord(random, word.left, word.baseline - LINE_GAP * 0.45, X_HEIGHT * 0.85).points];
}

// Turns the pen's points into short strokes with a time each. The pen presses harder on
// a downstroke, so those are drawn thicker.
function strokes(points, pen, timeOf) {
    const drawn = [];
    for (let index = 1; index < points.length; index += 1) {
        const from = points[index - 1];
        const to = points[index];
        const fall = Math.max(0, to.y - from.y) / (Math.hypot(to.x - from.x, to.y - from.y) || 1);
        drawn.push({ from, to, pen, width: (pen === "mark" ? 1 : 0.7) + 0.8 * fall, time: timeOf(to, index / points.length) });
    }
    return drawn;
}

function composePage(width, height, clear) {
    const random = seededRandom(SEED);
    const baselines = [];
    const written = [];
    const drawn = [];

    for (let baseline = LINE_GAP; baseline < height; baseline += LINE_GAP) baselines.push(baseline);

    for (const [index, baseline] of baselines.entries()) {
        const besideStage = baseline > clear.top - X_HEIGHT && baseline < clear.bottom + 3 * X_HEIGHT;
        const runs = besideStage
            ? [
                  [EDGE, clear.left - EDGE / 2],
                  [clear.right + EDGE / 2, width - EDGE],
              ]
            : [[EDGE, width - EDGE]];
        const startsAt = index * LINE_DELAY_MS;
        const timeOf = (point) => startsAt + (point.x / width) * LINE_MS;

        for (const [from, to] of runs) {
            if (to - from < SHORTEST_RUN) continue;
            for (const word of writeLine(random, baseline, from, to)) {
                written.push({ ...word, finishedAt: timeOf({ x: word.right }) });
                drawn.push(...strokes(word.points, "hand", timeOf));
            }
        }
    }

    const kinds = ["strike", "ring", "underline"];
    for (let mark = 0; mark < Math.min(MARKS, written.length); mark += 1) {
        const word = written[Math.floor(random() * written.length)];
        const startsAt = word.finishedAt + MARK_DELAY_MS + mark * 160;
        for (const points of markWord(random, word, kinds[mark % kinds.length])) {
            drawn.push(...strokes(points, "mark", (_point, along) => startsAt + along * 320));
        }
    }

    return { baselines, drawn: drawn.sort((first, second) => first.time - second.time) };
}

export function paintInkGround(canvas, stage) {
    const context = canvas.getContext("2d");
    let frame = 0;
    let size = "";

    const write = (animated) => {
        cancelAnimationFrame(frame);

        const bounds = canvas.getBoundingClientRect();
        const stageBounds = stage.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
        const styles = getComputedStyle(canvas);
        const inks = {
            rule: styles.getPropertyValue("--ground-rule").trim(),
            hand: styles.getPropertyValue("--ground-hand").trim(),
            mark: styles.getPropertyValue("--ground-mark").trim(),
        };
        const page = composePage(bounds.width, bounds.height, {
            left: stageBounds.left - bounds.left,
            right: stageBounds.right - bounds.left,
            top: stageBounds.top - bounds.top,
            bottom: stageBounds.bottom - bounds.top,
        });

        canvas.width = Math.round(bounds.width * ratio);
        canvas.height = Math.round(bounds.height * ratio);
        context.scale(ratio, ratio);
        context.lineCap = "round";

        context.strokeStyle = inks.rule;
        context.lineWidth = 1;
        context.beginPath();
        for (const baseline of page.baselines) {
            context.moveTo(0, baseline + 3.5);
            context.lineTo(bounds.width, baseline + 3.5);
        }
        context.stroke();

        const draw = (stroke) => {
            context.strokeStyle = inks[stroke.pen];
            context.lineWidth = stroke.width;
            context.beginPath();
            context.moveTo(stroke.from.x, stroke.from.y);
            context.lineTo(stroke.to.x, stroke.to.y);
            context.stroke();
        };

        if (!animated) {
            page.drawn.forEach(draw);
            return;
        }

        const startedAt = performance.now();
        let next = 0;
        const step = (now) => {
            while (next < page.drawn.length && page.drawn[next].time <= now - startedAt) {
                draw(page.drawn[next]);
                next += 1;
            }
            if (next < page.drawn.length) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
    };

    // The page is written once. When the desk changes size it is set down again whole.
    new ResizeObserver(() => {
        const nextSize = `${canvas.clientWidth}x${canvas.clientHeight}`;
        if (nextSize === size) return;
        write(size === "" && !reducedMotion.matches);
        size = nextSize;
    }).observe(canvas);
}
