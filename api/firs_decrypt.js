import crypto from "crypto";

export default async function handler(req, res) {
  try {
    // ✅ 1. Allow only POST requests
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ✅ 2. Extract credentials (UniFi sends them inside RequestHeaders)
    const { RequestHeaders, Content } = req.body || {};

    const apiKeyFromBody = RequestHeaders?.["x-api-key"];
    const apiSecretFromBody = RequestHeaders?.["x-api-secret"];

    const apiKey = apiKeyFromBody || process.env.FIRS_API_KEY;
    const apiSecret = apiSecretFromBody || process.env.FIRS_CLIENT_SECRET;

    // ✅ 3. Validate credentials (must match your Vercel environment values)
    if (!apiKey || !apiSecret) {
      return res.status(401).json({ error: "Missing API credentials" });
    }

    if (
      apiKey !== process.env.FIRS_API_KEY ||
      apiSecret !== process.env.FIRS_CLIENT_SECRET
    ) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    // ✅ 4. Parse FIRS Content string (UniFi sends as plain stringified JSON)
    if (!Content) {
      return res.status(400).json({ error: "Missing Content field" });
    }

    let parsedContent;
    try {
      parsedContent = typeof Content === "string" ? JSON.parse(Content) : Content;
    } catch (err) {
      return res.status(400).json({ error: "Invalid JSON in Content" });
    }

    // ✅ 5. Extract FIRS encrypted data fields
    const firsData = parsedContent.data || {};
    const ivHex = firsData.iv_hex;
    const pub = firsData.pub;
    const ciphertext = firsData.data; // the Base64 URL encoded ciphertext

    if (!ivHex || !pub || !ciphertext) {
      return res
        .status(400)
        .json({ error: "Missing iv_hex, pub, or ciphertext in FIRS data" });
    }

    // ✅ 6. Build AES-256-CFB decryption key
    // Combine pub + first UUID section of the API key
    const apiKeyPrefix = process.env.FIRS_API_KEY.split("-")[0];
    const decryptionKey = pub + apiKeyPrefix;

    // ✅ 7. Convert IV from hex to bytes
    const iv = Buffer.from(ivHex, "hex");

    // ✅ 8. Perform AES decryption
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
      return res.status(500).json({ error: "Decryption failed", details: err.message });
    }

    // ✅ 9. Attempt to parse decrypted text as JSON
    let decryptedJson;
    try {
      decryptedJson = JSON.parse(decryptedText);
    } catch {
      decryptedJson = decryptedText; // fallback to plain text if not JSON
    }

    // ✅ 10. Return the decrypted response
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
