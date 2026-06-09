import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [role, setRole] = useState('cashier');

  const handleSubmit = (e) => {
    e.preventDefault();
    login(name.trim() || (role === 'manager' ? 'Manager' : 'Staff'), role);
  };

  return (
    <div className="login-page">
      <div className="card login-card">
        <h1>☕ Café POS</h1>
        <p className="subtitle">Restaurant Point of Sale</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
          <div className="form-group">
            <label>Select Role</label>
            <div className="role-buttons">
              <button
                type="button"
                className={`role-btn ${role === 'cashier' ? 'selected' : ''}`}
                onClick={() => setRole('cashier')}
              >
                <strong>Cashier / Waiter</strong>
                <span>Orders, tables, payments</span>
              </button>
              <button
                type="button"
                className={`role-btn ${role === 'manager' ? 'selected' : ''}`}
                onClick={() => setRole('manager')}
              >
                <strong>Manager / Owner</strong>
                <span>Menu, sales, reports</span>
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            Start Shift
          </button>
        </form>
      </div>
    </div>
  );
}
