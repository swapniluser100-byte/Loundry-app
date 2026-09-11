// QR code rendering using the `qrcode` package's pure-JS SVG renderer.
//
// We import the package's browser build directly. The default Node entry
// point of `qrcode` pulls in renderers that touch `fs` (toFile/toFileStream),
// which do not exist in the Workers runtime. The browser build only exposes
// the canvas/SVG/data-URL friendly API surface and has no filesystem
// dependency, so it bundles and runs cleanly under Workers.
// @ts-ignore -- the browser build ships without its own type declarations
import QRCode from "qrcode/lib/browser.js";

export interface QrOptions {
  /** pixel width of the rendered SVG viewBox */
  width?: number;
  margin?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

/**
 * Renders `text` as a scannable QR code and returns raw SVG markup.
 * SVG is used (instead of PNG) because PNG rendering in the `qrcode`
 * package requires the `canvas` native addon, which is unavailable on
 * Workers. SVG renders crisply at any size in <img> tags and on print.
 */
export async function generateQrSvg(text: string, options: QrOptions = {}): Promise<string> {
  const svg: string = await QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: options.errorCorrectionLevel ?? "M",
    margin: options.margin ?? 2,
    width: options.width ?? 320,
  });
  return svg;
}

/** Convenience helper: SVG string -> data: URI, for inline use without R2. */
export function svgToDataUri(svg: string): string {
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}
