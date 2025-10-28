import crypto from "crypto";

export default async function handler(req, res) {
  try {
    // ✅ 1. Allow only POST requests
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ✅ 2. Extract credentials from UniFi body (or fallback to headers)
    const { RequestHeaders } = req.body || {};
    const apiKeyFromBody = RequestHeaders?.["x-api-key"];
    const apiSecretFromBody = RequestHeaders?.["x-api-secret"];

    const apiKey =
      apiKeyFromBody || req.headers["x-api-key"] || process.env.FIRS_API_KEY;
    const apiSecret =
      apiSecretFromBody ||
      req.headers["x-api-secret"] ||
      process.env.FIRS_CLIENT_SECRET;

    // ✅ 3. Validate the API credentials
    if (!apiKey || !apiSecret) {
      return res.status(401).json({ error: "Missing credentials" });
    }

    if (apiKey !== process.env.FIRS_API_KEY) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    // ✅ 4. Parse FIRS Content string
    const { Content } = req.body;

    if (!Content) {
      return res.status(400).json({ error: "Missing Content field" });
    }

    let contentJson;
    try {
      contentJson = JSON.parse(Content);
    } catch (err) {
      return res.status(400).json({ error: "Invalid Content JSON format" });
    }

    // ✅ 5. Extract actual data for decryption
    const firsData = contentJson.data || {};
    const ivHex = firsData.iv_hex;
    const pub = firsData.pub;
    const ciphertext = firsData.data; // ciphertext lives here

    if (!ivHex || !pub || !ciphertext) {
      return res.status(400).json({
        error: "Missing iv_hex, pub or ciphertext in Content.data",
      });
    }

    // ✅ 6. Build decryption key
    const apiKeyPrefix = process.env.FIRS_API_KEY.split("-")[0];
    const decryptionKey = pub + apiKeyPrefix;

    // ✅ 7. Convert IV from hex to bytes
    const iv = Buffer.from(ivHex, "hex");

    // ✅ 8. Decrypt using AES-256-CFB
    const decipher = crypto.createDecipheriv(
      "aes-256-cfb",
      Buffer.from(decryptionKey),
      iv
    );

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]);

    const decryptedText = decrypted.toString("utf8");

    // ✅ 9. Return decrypted text (parsed if JSON)
    let parsed;
    try {
      parsed = JSON.parse(decryptedText);
    } catch {
      parsed = decryptedText;
    }

    return res.status(200).json({ decrypted: parsed });
  } catch (err) {
    console.error("Decryption error:", err);
    return res.status(500).json({
      error: "Decryption failed",
      details: err.message,
    });
  }
}
