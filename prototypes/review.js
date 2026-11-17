// Review aid loaded by every concept page; like switcher.css, it is not part of any
// design. A concept is a single page, so links that would leave it are kept on it: a
// link to a page that has a matching section here (features, pricing, comparisons)
// scrolls to that section, and any other link says where it would go on feldar.com
// instead of going there. Modified clicks (new tab, new window) are left alone.
// The prototypes can be served from any folder, so their own address is worked out
// from where this script was loaded.
const SECTION_FOR_PATH = new Map([
    ["/features", "features"],
    ["/pricing", "pricing"],
    ["/compare", "compare"],
]);
const LIVE_SITE = "https://feldar.com";
const PROTOTYPE_BASE = new URL("./", import.meta.url).pathname;
const NOTICE_MILLISECONDS = 7000;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const notice = document.createElement("p");
notice.className = "pt-notice";
notice.setAttribute("role", "status");
notice.hidden = true;
document.body.append(notice);

let noticeTimer;

// A link to one of the site's own pages points at the live site, wherever the
// prototype happens to be served.
function liveAddressOf(destination) {
    if (destination.origin !== location.origin) return destination;
    return new URL(destination.pathname + destination.search + destination.hash, LIVE_SITE);
}

function showNotice(link, destination) {
    const label = link.textContent.trim().replace(/\s+/g, " ") || link.getAttribute("aria-label");
    const live = liveAddressOf(destination);
    const liveLink = document.createElement("a");
    liveLink.href = live.href;
    liveLink.target = "_blank";
    liveLink.rel = "noopener";
    liveLink.textContent = "Open it in a new tab";

    notice.replaceChildren(
        `"${label}" goes to ${live.host}${live.pathname}, which is not part of this prototype. `,
        liveLink,
    );
    notice.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
        notice.hidden = true;
    }, NOTICE_MILLISECONDS);
}

function sectionFor(pathname) {
    const name = SECTION_FOR_PATH.get(pathname);
    return name ? document.querySelector(`[data-proto-section~="${name}"]`) : null;
}

document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target.closest("a[href]");
    if (!link || notice.contains(link)) return;

    const destination = new URL(link.href);
    if (!destination.protocol.startsWith("http")) return;
    const isSameSite = destination.origin === location.origin;
    if (isSameSite && destination.pathname.startsWith(PROTOTYPE_BASE)) return;

    event.preventDefault();

    const section = isSameSite ? sectionFor(destination.pathname) : null;
    if (!section) {
        showNotice(link, destination);
        return;
    }
    section.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
});
