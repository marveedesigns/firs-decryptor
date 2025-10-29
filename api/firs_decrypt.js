import crypto from "crypto";

export default async function handler(req, res) {
  try {
    // ✅ Extract credentials (UniFi sends them inside RequestHeaders)
    const { RequestHeaders, data } = req.body || {};

    const apiKeyFromBody = RequestHeaders?.["x-api-key"];
    const apiSecretFromBody = RequestHeaders?.["x-api-secret"];

    const apiKey = apiKeyFromBody || process.env.FIRS_API_KEY;
    const apiSecret = apiSecretFromBody || process.env.FIRS_CLIENT_SECRET;

    // ✅ Validate credentials
    if (!apiKey || !apiSecret) {
      return res.status(401).json({ error: "Missing API credentials" });
    }

    if (
      apiKey !== process.env.FIRS_API_KEY ||
      apiSecret !== process.env.FIRS_CLIENT_SECRET
    ) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    // ✅ Read encrypted fields directly from req.body.data
    const { iv_hex, pub, data: ciphertext } = data || {};

    if (!iv_hex || !pub || !ciphertext) {
      console.log("Incoming body (debug):", JSON.stringify(req.body, null, 2));
      return res
        .status(400)
        .json({ error: "Missing iv_hex, pub, or data in request body" });
    }

    // ✅ Build AES-256-CFB decryption key
    const apiKeyPrefix = process.env.FIRS_API_KEY.split("-")[0];
    const decryptionKey = pub + apiKeyPrefix;

    // ✅ Convert IV from hex to bytes
    const iv = Buffer.from(iv_hex, "hex");

    // ✅ Perform AES decryption
    let decryptedText;
    try {
      const decipher = crypto.createDecipheriv(
        "aes-256-cfb",
        Buffer.from(decryptionKey),
        iv
      );
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ciphertext, "base64url")),
        decipher.final(),
      ]);
      decryptedText = decrypted.toString("utf8");
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Decryption failed", details: err.message });
    }

    // ✅ Attempt to parse decrypted text as JSON
    let decryptedJson;
    try {
      decryptedJson = JSON.parse(decryptedText);
    } catch {
      decryptedJson = decryptedText; // fallback if not JSON
    }

    // ✅ Return success
    return res.status(200).json({
      success: true,
      message: "Decryption successful",
      decrypted: decryptedJson,
    });
  } catch (err) {
    console.error("❌ Decryption handler error:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
}
