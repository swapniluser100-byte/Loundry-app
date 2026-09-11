import { t } from "../i18n";

const COLORS = {
  Received: "bg-amber-100 text-amber-800",
  "In Progress": "bg-blue-100 text-blue-800",
  "Ready for Pickup": "bg-purple-100 text-purple-800",
  "Handed Over": "bg-green-100 text-green-800",
};

export default function StatusBadge({ status }) {
  const classes = COLORS[status] || "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${classes}`}>
      {t.status[status] || status}
    </span>
  );
}
