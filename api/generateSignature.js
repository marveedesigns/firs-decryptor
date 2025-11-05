export const config = {
  api: {
    bodyParser: false, // ✅ Prevent auto-parsing so we can get exact raw body
  },
};

import crypto from "crypto";

export default async function handler(req, res) {
  try {
    const clientSecret = process.env.E_CLIENT_SECRET;
    if (!clientSecret) {
      return res.status(400).json({ error: "Missing CLIENT_SECRET env variable" });
    }

    // ✅ Read raw body (exact string Postman would sign)
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString("utf8").trim();

    // ✅ Generate timestamp (same format as Postman)
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

    // ✅ Build message and compute signature
    const message = rawBody + timestamp;
    const signature = crypto
      .createHmac("sha256", clientSecret)
      .update(message)
      .digest("base64");

    // ✅ Return both values for testing or downstream use
    return res.status(200).json({
      timestamp,
      signature,
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
