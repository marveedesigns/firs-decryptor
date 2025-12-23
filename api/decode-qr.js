export const config = {
  api: {
    bodyParser: false, // ✅ Prevent auto-parsing so we can get exact raw body
  },
};

// api/decode-qr.js
import decodeQRFromBase64 from "../lib/decodeQr.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Use POST",
    });
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        error: "imageBase64 is required",
      });
    }

    const qrPayload = await decodeQRFromBase64(imageBase64);

    return res.status(200).json({
      success: true,
      payload: qrPayload,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || String(err),
    });
  }
}
