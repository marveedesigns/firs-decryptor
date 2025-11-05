import crypto from "crypto";

export default async function handler(req, res) {
  try {
    // ✅ Get client secret from environment variable
    const clientSecret = process.env.E_CLIENT_SECRET;
    if (!clientSecret) {
      return res.status(400).json({ error: "Missing E_CLIENT_SECRET env variable" });
    }

    // ✅ Build timestamp
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

    // ✅ Get raw request body (payload)
    const payload = req.body ? JSON.stringify(req.body).trim() : "";

    // ✅ Create message = payload + timestamp
    const message = payload + timestamp;

    // ✅ Generate HMAC SHA256 signature
    const hash = crypto.createHmac("sha256", clientSecret)
                       .update(message)
                       .digest("base64");

    // ✅ Example: respond or use signature in verification
    return res.status(200).json({
      timestamp,
      signature: hash,
      message,
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
