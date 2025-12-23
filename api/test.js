import decodeQRFromBase64 from "../lib/decodeQr.js";

// REMOVE data:image/png;base64, if present
const base64Png = `
iVBORw0KGgoAAAANSUhEUgAAASwAAAE...
`.trim();

try {
  const qrText = await decodeQRFromBase64(base64Png);
  console.log("Decoded QR payload:");
  console.log(qrText);
} catch (err) {
  console.error("Failed to decode QR:", err);
}
