import { useEffect, useState, useCallback } from "react";
import { api, clearSession, getShopName } from "../api";
import { t, STATUS_FLOW } from "../i18n";
import StatusBadge from "../components/StatusBadge";
import { useNavigate } from "react-router-dom";

const NEXT_STATUS = {
  Received: "In Progress",
  "In Progress": "Ready for Pickup",
};

const NEXT_LABEL = {
  Received: t.moveToInProgress,
  "In Progress": t.moveToReady,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyOrder, setBusyOrder] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listOrders(filter || undefined);
      setOrders(data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function advanceStatus(order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setBusyOrder(order.order_number);
    try {
      await api.updateOrderStatus({ order_number: order.order_number, status: next });
      await load();
    } catch (err) {
      alert(err.message || t.errorGeneric);
    } finally {
      setBusyOrder(null);
    }
  }

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{getShopName()}</h1>
          <p className="text-sm text-gray-500">{t.allOrders}</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500 underline">
          {t.logout}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
        <FilterChip label={t.filterAll} active={filter === ""} onClick={() => setFilter("")} />
        {STATUS_FLOW.map((s) => (
          <FilterChip key={s} label={t.status[s]} active={filter === s} onClick={() => setFilter(s)} />
        ))}
      </div>

      {loading ? (
        <p className="text-center text-gray-400 mt-10">{t.loading}</p>
      ) : orders.length === 0 ? (
        <p className="text-center text-gray-400 mt-10">{t.noOrders}</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.order_number} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{order.order_number}</p>
                  <p className="text-sm text-gray-500">
                    {order.customer_name} · {order.customer_phone}
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.service_type} ·{" "}
                    {Object.entries(order.items)
                      .filter(([, qty]) => qty > 0)
                      .map(([name, qty]) => `${name} x${qty}`)
                      .join(", ")}
                  </p>
                  {order.amount != null && (
                    <p className="text-sm text-gray-700 font-medium mt-1">₹{order.amount}</p>
                  )}
                </div>
                <StatusBadge status={order.status} />
              </div>

              {NEXT_STATUS[order.status] && (
                <button
                  className="btn-secondary w-full mt-3 text-sm"
                  disabled={busyOrder === order.order_number}
                  onClick={() => advanceStatus(order)}
                >
                  {busyOrder === order.order_number ? t.updating : NEXT_LABEL[order.status]}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium border ${
        active ? "bg-brand text-white border-brand" : "bg-white text-gray-600 border-gray-200"
      }`}
    >
      {label}
    </button>
  );
}
