// The recordings, played in the page's one player. This is scripts/components/
// recording-player.ts as plain JavaScript, because the prototype is published as static
// files without the site's build. Without this script a link opens the file itself.

function initRecordingPlayer(player) {
    const video = player.querySelector("video");
    const title = player.querySelector("[data-recording-title]");

    for (const link of document.querySelectorAll("a[data-recording]")) {
        link.addEventListener("click", (event) => {
            // A modified click opens the file in a new tab or window, as it does on any link.
            if (event.metaKey || event.ctrlKey || event.shiftKey) return;

            event.preventDefault();
            title.textContent = link.dataset.title;
            // On a phone the player shows an upright part of the window. This says which.
            video.style.objectPosition = link.dataset.focus;
            player.showModal();
            video.src = link.href;
            // Closing the player before the recording has loaded interrupts play. Nothing is
            // wrong then, so only other failures are passed on.
            video.play().catch((error) => {
                if (error.name !== "AbortError") throw error;
            });
        });
    }

    // A press on the backdrop lands on the dialog itself, never on what it holds.
    player.addEventListener("click", (event) => {
        if (event.target === player) player.close();
    });

    player.addEventListener("close", () => {
        // The browser sends close with its next frame. If the player has been opened again
        // by then, the source is the new recording's and has to stay.
        if (player.open) return;

        video.removeAttribute("src");
        video.load();
    });
}

const recordingPlayer = document.querySelector("[data-recording-player]");

if (recordingPlayer) initRecordingPlayer(recordingPlayer);
