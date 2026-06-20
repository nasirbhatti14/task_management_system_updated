import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { User } from "./types";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem("taskflow_user");
    const token = localStorage.getItem("taskflow_token");
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("taskflow_user");
    localStorage.removeItem("taskflow_token");
    setUser(null);
    navigate("/login");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 rounded-full border-4 border-slate-300 border-t-indigo-600 animate-spin"></div></div>;
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!user ? <AuthPage onLogin={setUser} /> : <Navigate to="/" />} 
      />
      <Route 
        path="/" 
        element={user ? <DashboardPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
