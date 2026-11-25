// The page's pieces of the app come from prototypes/editor-hero, so the editor window and
// every piece keep one source of markup. The source page is fetched once; each part taken
// from it is a copy with its relative links resolved from the source's folder.
const SOURCE = new URL("../editor-hero/index.html", import.meta.url);
const LINK_ATTRIBUTES = ["src", "href"];

let source;

export function loadAppSource() {
    source ??= fetch(SOURCE).then(async (response) => {
        if (!response.ok) {
            throw new Error(`Could not load the app's pieces from ${SOURCE}: ${response.status}`);
        }
        return new DOMParser().parseFromString(await response.text(), "text/html");
    });
    return source;
}

function rebaseLinks(root) {
    for (const element of root.querySelectorAll("[src], [href]")) {
        for (const name of LINK_ATTRIBUTES) {
            const link = element.getAttribute(name);
            if (link && !link.startsWith("#")) {
                element.setAttribute(name, new URL(link, SOURCE).href);
            }
        }
    }
}

export function takePart(page, selector) {
    const part = page.querySelector(selector);
    if (!part) {
        throw new Error(`The editor prototype has no ${selector}`);
    }
    const copy = part.cloneNode(true);
    rebaseLinks(copy);
    return copy;
}
