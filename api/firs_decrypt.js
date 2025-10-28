import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 🔒 Validate headers from UniFi
  const apiKeyHeader = req.headers["x-api-key"];
  const apiSecretHeader = req.headers["x-api-secret"];

  if (
    apiKeyHeader !== process.env.FIRS_API_KEY ||
    apiSecretHeader !== process.env.FIRS_CLIENT_SECRET
  ) {
    return res.status(401).json({ error: "Unauthorized request" });
  }

  try {
    const { ciphertext, pub, iv_key } = req.body;

    // ✅ Get the actual API key from environment (not from request)
    const firsApiKey = process.env.FIRS_API_KEY;

    // Build the decryption key according to FIRS spec
    const firstSegment = firsApiKey.split("-")[0];
    const keyString = pub + firstSegment;
    const key = Buffer.from(keyString, "utf8");

    // Convert IV from hex
    const iv = Buffer.from(iv_key, "hex");

    // Decode Base64URL ciphertext
    const ciphertextBytes = Buffer.from(ciphertext, "base64url");

    // Perform AES-256-CFB decryption
    const decipher = crypto.createDecipheriv("aes-256-cfb", key, iv);
    const decrypted = Buffer.concat([
      decipher.update(ciphertextBytes),
      decipher.final(),
    ]);
    const decryptedText = decrypted.toString("utf8");

    // Return the decrypted result
    return res.status(200).json({
      success: true,
      decryptedText,
    });
  } catch (error) {
    console.error("Decryption error:", error);
    return res.status(500).json({
      error: "Decryption failed",
      details: error.message,
    });
  }
}
