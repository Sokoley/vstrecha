import QRCode from "qrcode";

export async function generateQrDataUrl(text: string, size = 256) {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
  });
}

export function badgePayload(badgeCode: string) {
  return badgeCode;
}
