import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/login", { state: { from: location } });
    }
  }, [navigate, location]);

  const token = localStorage.getItem("auth_token");
  if (!token) {
    return null;
  }

  return <>{children}</>;
}
