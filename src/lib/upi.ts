export interface UpiParams {
  /** Payee UPI VPA, e.g. "shreelaundry@okhdfcbank" */
  pa: string;
  /** Payee display name */
  pn: string;
  /** Amount in rupees, e.g. 150 or 150.50 */
  am: number;
  /** Currency code, defaults to INR */
  cu?: string;
  /** Transaction note shown in the customer's UPI app */
  tn?: string;
}

/**
 * Builds a standard UPI deep link, e.g.:
 * upi://pay?pa=shopkeeper@upi&pn=Shree%20Laundry&am=150.00&cu=INR&tn=Laundry%20PN-LND-2026-000123
 * Any UPI app (GPay, PhonePe, Paytm, BHIM) can open this link directly, and
 * the same string encoded as a QR code can be scanned by the customer.
 */
export function buildUpiUri(params: UpiParams): string {
  const qs = new URLSearchParams();
  qs.set("pa", params.pa);
  qs.set("pn", params.pn);
  qs.set("am", params.am.toFixed(2));
  qs.set("cu", params.cu ?? "INR");
  if (params.tn) qs.set("tn", params.tn);
  return `upi://pay?${qs.toString()}`;
}
