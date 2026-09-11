import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { STATUS_FLOW } from "../constants";
import StatusBadge from "../components/StatusBadge";

// Public, no-login page that the QR code and email tracking link point to.
// Customers open this on their own phone to see live status and, once
// ready, the same QR they can show at the counter for pickup.
export default function OrderPublic() {
  const { orderNumber } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getPublicOrder(orderNumber)
      .then(setData)
      .catch(() => setError("Order not found"));
  }, [orderNumber]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  const { order, shop_name } = data;
  const currentIndex = STATUS_FLOW.indexOf(order.status);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-lg font-bold text-gray-900">{shop_name}</h1>
          <p className="text-sm text-gray-500">Your Laundry Order</p>
        </div>

        <div className="card text-center space-y-2">
          <p className="text-sm text-gray-500">Order ID</p>
          <p className="text-xl font-mono font-bold text-brand">{order.order_number}</p>
          <StatusBadge status={order.status} />
        </div>

        <div className="card">
          <div className="flex justify-between">
            {STATUS_FLOW.map((s, i) => (
              <div key={s} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i <= currentIndex ? "bg-brand text-white" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i + 1}
                </div>
                <p className="text-[10px] text-center text-gray-500 mt-1 leading-tight">{s}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card space-y-1">
          <p className="text-sm text-gray-500">Items</p>
          <p className="text-gray-800">
            {Object.entries(order.items)
              .filter(([, qty]) => qty > 0)
              .map(([name, qty]) => `${name} x${qty}`)
              .join(", ")}
          </p>
          <p className="text-sm text-gray-500 mt-2">{order.service_type}</p>
          {order.amount != null && (
            <p className="text-lg font-bold text-gray-900 mt-2">Amount: ₹{order.amount}</p>
          )}
        </div>

        {order.qr_code_url && (
          <div className="card text-center">
            <img
              src={order.qr_code_url}
              alt="Order QR"
              className="w-48 h-48 mx-auto border border-gray-200 rounded-xl p-2"
            />
            <p className="text-xs text-gray-500 mt-2">Show this QR code at pickup</p>
          </div>
        )}
      </div>
    </div>
  );
}
