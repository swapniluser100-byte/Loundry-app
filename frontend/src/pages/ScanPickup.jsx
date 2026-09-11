import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../api";
import { t } from "../i18n";
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
      setError("Camera suru karta ale nahi. Manual Order ID takaa.");
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
      setError(t.orderNotFound);
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
      setError(err.message || t.errorGeneric);
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
      setError(err.message || t.errorGeneric);
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
      <h1 className="text-xl font-bold text-gray-900">{t.scanQr}</h1>

      {!order && (
        <>
          <div className="card space-y-3">
            <p className="text-sm text-gray-600">{t.scanInstructions}</p>
            <div id={SCANNER_ELEMENT_ID} className="w-full rounded-xl overflow-hidden" />
            {!scanning ? (
              <button className="btn-primary w-full" onClick={startCamera}>
                {t.startCamera}
              </button>
            ) : (
              <button className="btn-secondary w-full" onClick={stopCamera}>
                {t.stopCamera}
              </button>
            )}
          </div>

          <form onSubmit={handleManualFind} className="card space-y-3">
            <p className="text-sm font-semibold text-gray-700">{t.manualEntryTitle}</p>
            <input
              className="input-field"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder={t.enterOrderId}
            />
            <button type="submit" className="btn-secondary w-full">
              {t.findOrder}
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
              <label className="block text-sm font-medium text-gray-700">{t.finalAmount}</label>
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
                {busy ? t.generatingQr : t.generatePaymentQr}
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
              <p className="text-sm text-gray-600">{t.scanToPay}</p>
              <p className="text-lg font-bold text-gray-900">₹{upiQr.amount}</p>
              <a href={upiQr.upi_uri} className="btn-secondary block">
                {t.openUpiApp}
              </a>
              <button className="btn-primary w-full" onClick={handleHandover} disabled={busy}>
                {busy ? t.updating : t.markHandedOver}
              </button>
            </div>
          )}

          {handedOver && (
            <div className="card text-center space-y-3">
              <div className="text-5xl">🎉</div>
              <p className="font-bold text-green-700">{t.handoverDone}</p>
              <button className="btn-secondary w-full" onClick={resetScan}>
                {t.scanQr}
              </button>
            </div>
          )}

          {!handedOver && (
            <button className="text-sm text-gray-500 underline w-full text-center" onClick={resetScan}>
              {t.back}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
