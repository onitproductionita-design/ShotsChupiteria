import QRCode from "qrcode";

/**
 * QR come SVG inline: nessuna richiesta di rete in più e resta nitido
 * a qualsiasi dimensione, anche su schermi sporchi e luci basse.
 */
export function renderQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    type: "svg",
    margin: 1,
    // Livello alto: lo schermo del cliente può essere rigato o pieno di ditate.
    errorCorrectionLevel: "H",
    color: { dark: "#08060f", light: "#ffffff" },
  });
}

/** Link che il barman apre inquadrando lo scontrino. */
export function buildRedeemUrl(
  baseUrl: string,
  code: string,
  token: string,
): string {
  return `${baseUrl}/bar/ritiro?c=${encodeURIComponent(code)}&t=${encodeURIComponent(token)}`;
}
