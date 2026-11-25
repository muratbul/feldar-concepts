// The held Canvas links that tie one part of the page to the next: from the bottom edge of
// one box to the top edge of the box under it, drawn from where the boxes really are and
// redrawn whenever the page's layout changes. A link shows only at widths where its two
// boxes sit one above the other.
const SVG = "http://www.w3.org/2000/svg";
// Where a link meets its target, it keeps this far in from the target's side edges.
const EDGE_INSET = 24;

const LINKS = [
    { from: "[data-link-source='ledger']", to: ".sv-window-cell", media: "(min-width: 1241px)" },
    { from: ".sv-stage", to: ".sg-page", media: "(min-width: 961px)" },
];

function pageBox(element) {
    const box = element.getBoundingClientRect();
    return {
        left: box.left + window.scrollX,
        right: box.right + window.scrollX,
        top: box.top + window.scrollY,
        bottom: box.bottom + window.scrollY,
    };
}

// Straight down when the source's centre is over the target; otherwise down, across and
// down again, as the Canvas routes a link between cards that are not in line.
function linkPath(source, target) {
    const startX = (source.left + source.right) / 2;
    const endX = Math.min(Math.max(startX, target.left + EDGE_INSET), target.right - EDGE_INSET);
    const startY = source.bottom;
    const endY = target.top;
    if (startX === endX) return `M${startX} ${startY}V${endY}`;
    const turnY = (startY + endY) / 2;
    return `M${startX} ${startY}V${turnY}H${endX}V${endY}`;
}

export function initLinks() {
    const layer = document.createElementNS(SVG, "svg");
    layer.setAttribute("class", "sv-links");
    layer.setAttribute("aria-hidden", "true");
    document.body.append(layer);

    const draw = () => {
        const paths = LINKS.flatMap(({ from, to, media }) => {
            const source = document.querySelector(from);
            const target = document.querySelector(to);
            if (!source || !target || !window.matchMedia(media).matches) return [];
            const sourceBox = pageBox(source);
            const targetBox = pageBox(target);
            if (targetBox.top <= sourceBox.bottom) return [];
            const path = document.createElementNS(SVG, "path");
            path.setAttribute("d", linkPath(sourceBox, targetBox));
            return [path];
        });
        // The layer counts toward the page's size, so it shrinks away before the page is
        // measured; otherwise a page that got shorter would keep its old height.
        layer.setAttribute("width", 0);
        layer.setAttribute("height", 0);
        layer.setAttribute("width", document.documentElement.scrollWidth);
        layer.setAttribute("height", document.documentElement.scrollHeight);
        layer.replaceChildren(...paths);
    };

    new ResizeObserver(draw).observe(document.body);
    draw();
}
