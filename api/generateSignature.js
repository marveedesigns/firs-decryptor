import crypto from "crypto";

export default async function handler(req, res) {
  try {
    const clientSecret = process.env.E_CLIENT_SECRET;
    if (!clientSecret) {
      return res.status(400).json({ error: "Missing E_CLIENT_SECRET env variable" });
    }

    // --- Prepare payload ---
    const payload = req.body ? JSON.stringify(req.body).trim() : "";

    // --- Generate timestamps directly ---
    const isoUtc = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const isoPlus1 = new Date(Date.now() + 60 * 60 * 1000)
      .toISOString()
      .replace(/\.\d{3}Z$/, "+01:00");

    // --- Create message and signature ---
    const message = payload + isoUtc;
    const signature = crypto
      .createHmac("sha256", clientSecret)
      .update(message)
      .digest("base64");

    // --- Return result ---
    return res.status(200).json({
      success: true,
      signature,
      timestamp: {
        ISO_UTC: isoUtc,
        ISO_PLUS1: isoPlus1
      },
      message
    });

  } catch (err) {
    console.error("Error generating signature:", err);
    return res.status(500).json({ error: err.message });
  }
}