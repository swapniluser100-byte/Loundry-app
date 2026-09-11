import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../api";
import StatusBadge from "../components/StatusBadge";

const SCANNER_ELEMENT_ID = "qr-reader";

export default function ScanPickup() {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [manualId, setManualId] = useState("");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [upiQr, setUpiQr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [handedOver, setHandedOver] = useState(false);

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    setError("");
    try {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopCamera();
          fetchOrder(decodedText);
        },
        () => {
          /* per-frame decode failures are normal while aiming - ignore */
        }
      );
      setScanning(true);
    } catch (err) {
      setError("Could not start camera. Please enter the Order ID manually.");
    }
  }

  async function stopCamera() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        /* already stopped */
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }

  async function fetchOrder(rawText) {
    setError("");
    try {
      const data = await api.getOrderByQr(rawText);
      setOrder(data.order);
      setAmount(data.order.amount != null ? String(data.order.amount) : "");
      setUpiQr(null);
      setHandedOver(false);
    } catch (err) {
      setError("Order not found");
    }
  }

  async function handleManualFind(e) {
    e.preventDefault();
    if (!manualId.trim()) return;
    await fetchOrder(manualId.trim());
  }

  async function handleGenerateQr() {
    if (!order || !amount || Number(amount) <= 0) return;
    setBusy(true);
    setError("");
    try {
      const data = await api.generateUpiQr(order.order_number, Number(amount));
      setUpiQr(data);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleHandover() {
    if (!order) return;
    setBusy(true);
    setError("");
    try {
      await api.updateOrderStatus({
        order_number: order.order_number,
        status: "Handed Over",
        amount: Number(amount),
      });
      setHandedOver(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function resetScan() {
    setOrder(null);
    setAmount("");
    setUpiQr(null);
    setHandedOver(false);
    setManualId("");
    setError("");
  }

  return (
    <div className="px-4 pt-6 pb-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Scan QR Code</h1>

      {!order && (
        <>
          <div className="card space-y-3">
            <p className="text-sm text-gray-600">Point the camera at the customer's QR code</p>
            <div id={SCANNER_ELEMENT_ID} className="w-full rounded-xl overflow-hidden" />
            {!scanning ? (
              <button className="btn-primary w-full" onClick={startCamera}>
                Start Camera
              </button>
            ) : (
              <button className="btn-secondary w-full" onClick={stopCamera}>
                Stop Camera
              </button>
            )}
          </div>

          <form onSubmit={handleManualFind} className="card space-y-3">
            <p className="text-sm font-semibold text-gray-700">Or enter the Order ID manually</p>
            <input
              className="input-field"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="Enter Order ID (e.g. PN-LND-2026-000123)"
            />
            <button type="submit" className="btn-secondary w-full">
              Find Order
            </button>
          </form>
        </>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {order && (
        <div className="space-y-4">
          <div className="card space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-mono font-bold text-brand">{order.order_number}</p>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-sm text-gray-700">{order.customer_name} · {order.customer_phone}</p>
            <p className="text-sm text-gray-500">
              {order.service_type} ·{" "}
              {Object.entries(order.items)
                .filter(([, qty]) => qty > 0)
                .map(([name, qty]) => `${name} x${qty}`)
                .join(", ")}
            </p>
          </div>

          {!handedOver && (
            <div className="card space-y-3">
              <label className="block text-sm font-medium text-gray-700">Final Amount</label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button className="btn-primary w-full" onClick={handleGenerateQr} disabled={busy}>
                {busy ? "Generating QR code..." : "Generate Payment QR Code"}
              </button>
            </div>
          )}

          {upiQr && !handedOver && (
            <div className="card text-center space-y-3">
              <img
                src={upiQr.qr_data_uri}
                alt="UPI Payment QR"
                className="w-56 h-56 mx-auto border border-gray-200 rounded-xl p-2"
              />
              <p className="text-sm text-gray-600">Ask the customer to scan this UPI QR code to pay</p>
              <p className="text-lg font-bold text-gray-900">₹{upiQr.amount}</p>
              <a href={upiQr.upi_uri} className="btn-secondary block">
                Open in UPI App
              </a>
              <button className="btn-primary w-full" onClick={handleHandover} disabled={busy}>
                {busy ? "Updating..." : "Payment Received - Mark as Handed Over"}
              </button>
            </div>
          )}

          {handedOver && (
            <div className="card text-center space-y-3">
              <div className="text-5xl">🎉</div>
              <p className="font-bold text-green-700">Handed over. Confirmation email sent.</p>
              <button className="btn-secondary w-full" onClick={resetScan}>
                Scan QR Code
              </button>
            </div>
          )}

          {!handedOver && (
            <button className="text-sm text-gray-500 underline w-full text-center" onClick={resetScan}>
              Back
            </button>
          )}
        </div>
      )}
    </div>
  );
}
