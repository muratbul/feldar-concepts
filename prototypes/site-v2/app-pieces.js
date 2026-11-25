// Fills each holder marked data-app-piece="<selector>" with that piece of the app, as the
// editor prototype draws it. The pieces are pictures of the app and take no input.
import { loadAppSource, takePart } from "./app-source.js";

export async function mountPieces(root) {
    const page = await loadAppSource();
    for (const holder of root.querySelectorAll("[data-app-piece]")) {
        holder.append(takePart(page, holder.dataset.appPiece));
    }
}
