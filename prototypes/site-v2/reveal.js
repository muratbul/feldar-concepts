// Splits text marked data-line-reveal into its rendered lines, so CSS can reveal each line
// on its own scroll timeline (site.css, .sv-line). Lines depend on the width, so the text
// is split again whenever the element's width changes.
function measureLines(element, words) {
    element.replaceChildren(
        ...words.flatMap((word, index) => {
            const span = document.createElement("span");
            span.textContent = word;
            return index === 0 ? [span] : [" ", span];
        }),
    );
    const lines = [];
    let top = null;
    for (const span of element.querySelectorAll("span")) {
        if (span.offsetTop !== top) {
            lines.push([]);
            top = span.offsetTop;
        }
        lines.at(-1).push(span.textContent);
    }
    return lines;
}

function splitIntoLines(element, words) {
    const lines = measureLines(element, words).map((lineWords) => {
        const line = document.createElement("span");
        line.className = "sv-line";
        line.textContent = lineWords.join(" ");
        return line;
    });
    element.replaceChildren(...lines);
}

// Line breaks depend on the face, so the first split waits for the page's fonts.
export async function initLineReveal(root) {
    await document.fonts.ready;
    for (const element of root.querySelectorAll("[data-line-reveal]")) {
        const words = element.textContent.trim().split(/\s+/);
        let width = 0;
        new ResizeObserver(([entry]) => {
            const nextWidth = Math.round(entry.contentRect.width);
            if (nextWidth === width) return;
            width = nextWidth;
            splitIntoLines(element, words);
        }).observe(element);
    }
}
