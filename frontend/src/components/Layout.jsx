import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout, isManager } = useAuth();

  return (
    <div className="app-layout">
      <nav className="top-nav">
        <div className="brand">☕ Café POS</div>
        <div className="nav-links">
          <NavLink to="/" end>New Order</NavLink>
          <NavLink to="/tables">Tables</NavLink>
          <NavLink to="/kitchen">Kitchen</NavLink>
          {isManager && (
            <>
              <NavLink to="/menu">Menu</NavLink>
              <NavLink to="/dashboard">Dashboard</NavLink>
            </>
          )}
        </div>
        <div className="user-bar">
          <span>{user?.name} ({user?.role})</span>
          <button className="btn btn-secondary btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
