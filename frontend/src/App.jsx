import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import POS from './pages/POS';
import Tables from './pages/Tables';
import Kitchen from './pages/Kitchen';
import MenuAdmin from './pages/MenuAdmin';
import Dashboard from './pages/Dashboard';

function ProtectedRoute({ children, managerOnly }) {
  const { user, isManager } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (managerOnly && !isManager) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<POS />} />
        <Route path="tables" element={<Tables />} />
        <Route path="kitchen" element={<Kitchen />} />
        <Route
          path="menu"
          element={
            <ProtectedRoute managerOnly>
              <MenuAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute managerOnly>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
