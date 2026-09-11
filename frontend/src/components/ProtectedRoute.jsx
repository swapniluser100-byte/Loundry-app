import { Navigate } from "react-router-dom";
import { isLoggedIn } from "../api";
import BottomNav from "./BottomNav";

export default function ProtectedRoute({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="min-h-screen pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
