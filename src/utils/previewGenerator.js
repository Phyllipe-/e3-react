/**
 * previewGenerator.js
 * Renders the tilemap onto an offscreen canvas and returns a PNG Blob.
 */

const PREVIEW_MAX = 256; // max side in pixels

/**
 * @param {object}  tilemap        — context tilemap state
 * @param {object}  spriteSheetMap — { [path]: HTMLImageElement }
 * @returns {Promise<Blob|null>}
 */
export function generatePreviewBlob(tilemap, spriteSheetMap) {
    return new Promise((resolve) => {
        try {
            const TILE = tilemap.tileSize || 32;
            const cols = tilemap.width  || 5;
            const rows = tilemap.height || 5;

            const naturalW = cols * TILE;
            const naturalH = rows * TILE;

            // Scale down if too large
            const scale = Math.min(1, PREVIEW_MAX / Math.max(naturalW, naturalH));
            const w = Math.round(naturalW * scale);
            const h = Math.round(naturalH * scale);

            const canvas = document.createElement("canvas");
            canvas.width  = w;
            canvas.height = h;

            const ctx = canvas.getContext("2d");

            // Background
            ctx.fillStyle = "#f5f5f4";
            ctx.fillRect(0, 0, w, h);

            // Draw sprites layer by layer
            for (const layer of tilemap.layers) {
                if (layer.visible === false) continue;
                for (const sprite of layer.sprites) {
                    if (!sprite.visible && sprite.visible !== undefined) continue;
                    const img = spriteSheetMap[sprite.path];
                    if (!img) continue;

                    const [sCols = 1, sRows = 1] = sprite.size || [];
                    ctx.drawImage(
                        img,
                        sprite.x * TILE * scale,
                        sprite.y * TILE * scale,
                        TILE * sCols * scale,
                        TILE * sRows * scale
                    );
                }
            }

            // Light grid
            ctx.strokeStyle = "rgba(0,0,0,0.1)";
            ctx.lineWidth = 0.5;
            for (let c = 0; c <= cols; c++) {
                ctx.beginPath();
                ctx.moveTo(c * TILE * scale, 0);
                ctx.lineTo(c * TILE * scale, h);
                ctx.stroke();
            }
            for (let r = 0; r <= rows; r++) {
                ctx.beginPath();
                ctx.moveTo(0, r * TILE * scale);
                ctx.lineTo(w, r * TILE * scale);
                ctx.stroke();
            }

            canvas.toBlob((blob) => resolve(blob), "image/png");
        } catch (_) {
            resolve(null);
        }
    });
}
