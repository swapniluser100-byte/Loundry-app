// Colors validated as CVD-distinguishable as a set (scripts/validate_palette.js
// from the dataviz skill, amber/blue/pink/green at #f59e0b/#3b82f6/#ec4899/#16a34a).
// Status is never conveyed by color alone - the text label is always shown too.
const COLORS = {
  Received: "bg-amber-100 text-amber-800",
  "In Progress": "bg-blue-100 text-blue-800",
  "Ready for Pickup": "bg-pink-100 text-pink-800",
  "Handed Over": "bg-green-100 text-green-800",
};

export default function StatusBadge({ status }) {
  const classes = COLORS[status] || "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${classes}`}>{status}</span>
  );
}
