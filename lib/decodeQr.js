// lib/decodeQr.js
import { Jimp } from "jimp";
import QrCode from "qrcode-reader";

export default async function decodeQRFromBase64(base64Png) {
  if (!base64Png) {
    throw new Error("No base64 image provided");
  }

  // Remove data URI if present
  const cleanBase64 = base64Png.replace(/^data:image\/png;base64,/, "");
  const buffer = Buffer.from(cleanBase64, "base64");

  const image = await Jimp.read(buffer);

  return new Promise((resolve, reject) => {
    const qr = new QrCode();

    qr.callback = (err, value) => {
      if (err) return reject(err);
      if (!value) return reject("No QR code found in image");

      resolve(value.result);
    };

    qr.decode(image.bitmap);
  });
}
