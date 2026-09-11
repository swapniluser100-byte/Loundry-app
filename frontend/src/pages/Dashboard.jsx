import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, clearSession, getShopName } from "../api";
import StatusBadge from "../components/StatusBadge";

// Status accents match StatusBadge's colors exactly, so a status means the
// same color everywhere in the app. Always paired with a text label (here
// and in StatusBadge) - color is never the only way status is conveyed.
const STATUS_ACCENT = {
  Received: "bg-amber-500",
  "In Progress": "bg-blue-500",
  "Ready for Pickup": "bg-pink-500",
  "Handed Over": "bg-green-600",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getOrderStats()
      .then(setStats)
      .catch((err) => setError(err.message || "Could not load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="px-4 pt-6 pb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{getShopName()}</h1>
          <p className="text-sm text-gray-500">Dashboard</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500 underline">
          Log Out
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 mt-10">Loading...</p>
      ) : error ? (
        <p className="text-center text-red-600 mt-10">{error}</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Today's Orders" value={stats.today.orders} />
            <StatTile label="Today's Revenue" value={`₹${stats.today.revenue}`} />
            <StatTile label="Total Orders" value={stats.totals.orders} />
            <StatTile label="Total Revenue" value={`₹${stats.totals.revenue}`} />
          </div>

          <div className="card space-y-3">
            <p className="font-semibold text-gray-900">Orders by Status</p>
            {Object.entries(stats.by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${STATUS_ACCENT[status]}`} />
                  <span className="text-sm text-gray-700">{status}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>

          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900">Recent Orders</p>
              <Link to="/orders" className="text-sm text-brand font-medium">
                View All
              </Link>
            </div>
            {stats.recent_orders.length === 0 ? (
              <p className="text-sm text-gray-400">No orders yet</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {stats.recent_orders.map((order) => (
                  <div key={order.order_number} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.order_number}</p>
                      <p className="text-xs text-gray-500">{order.customer_name}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="card">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
