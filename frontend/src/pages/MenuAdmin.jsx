import { useEffect, useState } from 'react';
import { menuApi } from '../api';
import { formatMoney } from '../utils/format';

export default function MenuAdmin() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    price: '',
    category_id: '',
    description: '',
    available: true,
  });

  const load = async () => {
    const [menuItems, cats] = await Promise.all([
      menuApi.getItems(),
      menuApi.getCategories(),
    ]);
    setItems(menuItems);
    setCategories(cats);
    if (cats.length && !form.category_id) {
      setForm((f) => ({ ...f, category_id: cats[0].id }));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: '',
      price: '',
      category_id: categories[0]?.id || '',
      description: '',
      available: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = {
      ...form,
      price: Number(form.price),
      category_id: Number(form.category_id),
    };
    if (editing) {
      await menuApi.updateItem(editing, body);
    } else {
      await menuApi.createItem(body);
    }
    resetForm();
    load();
  };

  const startEdit = (item) => {
    setEditing(item.id);
    setForm({
      name: item.name,
      price: item.price,
      category_id: item.category_id,
      description: item.description || '',
      available: !!item.available,
    });
  };

  const toggleStock = async (item) => {
    await menuApi.toggleAvailability(item.id, !item.available);
    load();
  };

  return (
    <div>
      <h1 className="page-title">Menu Management</h1>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>{editing ? 'Edit Item' : 'Add New Item'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Price</label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) => setForm({ ...form, available: e.target.checked })}
            />
            Available
          </label>
          <div className="action-bar">
            <button type="submit" className="btn btn-primary">
              {editing ? 'Update' : 'Add Item'}
            </button>
            {editing && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <table className="menu-admin-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.name}</strong>
                  {item.description && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {item.description}
                    </div>
                  )}
                </td>
                <td>{item.category_name}</td>
                <td>{formatMoney(item.price)}</td>
                <td>
                  <span className={`badge badge-${item.available ? 'available' : 'cancelled'}`}>
                    {item.available ? 'In Stock' : 'Out of Stock'}
                  </span>
                </td>
                <td>
                  <div className="action-bar">
                    <button className="btn btn-secondary btn-sm" onClick={() => startEdit(item)}>
                      Edit
                    </button>
                    <button
                      className={`btn btn-sm ${item.available ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => toggleStock(item)}
                    >
                      {item.available ? 'Mark Out' : 'Restock'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
