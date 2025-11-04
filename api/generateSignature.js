import crypto from "crypto";

export default async function handler(req, res) {
  try {
    // --- 1️⃣ Get secret from Vercel environment ---
    const clientSecret = process.env.E_CLIENT_SECRET;
    if (!clientSecret) {
      return res.status(400).json({ error: "Missing E_CLIENT_SECRET env variable" });
    }

    // --- 2️⃣ Prepare payload ---
    const payload = req.body ? JSON.stringify(req.body).trim() : "";

    // --- 3️⃣ Generate timestamps ---
    const unixTimestamp = Math.floor(Date.now() / 1000);

    // ISO UTC without milliseconds
    const isoUtc = new Date(unixTimestamp * 1000)
      .toISOString()
      .replace(/\.\d{3}Z$/, "Z");

    // ISO +01:00 offset (West Africa Time)
    const plus1 = new Date(unixTimestamp * 1000 + 60 * 60 * 1000)
      .toISOString()
      .replace(/\.\d{3}Z$/, "+01:00");

    // --- 4️⃣ Create message and signature (Node native) ---
    const message = payload + plus1;
    const hash = crypto
      .createHmac("sha256", clientSecret)
      .update(message)
      .digest("base64");

    // --- 5️⃣ Return to UniFi ---
    return res.status(200).json({
      success: true,
      signature: hash,
      timestamp: {
        UNIX: unixTimestamp,
        ISO_UTC: isoUtc,
        ISO_PLUS1: plus1
      },
      message
    });

  } catch (err) {
    console.error("Error generating signature:", err);
    return res.status(500).json({ error: err.message });
  }
}