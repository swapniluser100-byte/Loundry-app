import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/orders", label: "Orders", icon: "📋" },
  { to: "/new-order", label: "New Order", icon: "🧺" },
  { to: "/scan", label: "Scan QR Code", icon: "📷" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-20">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg text-xs font-medium ${
              isActive ? "text-brand" : "text-gray-500"
            }`
          }
        >
          <span className="text-xl leading-none">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
