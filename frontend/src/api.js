const API = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const menuApi = {
  getCategories: () => request('/menu/categories'),
  getItems: (availableOnly) =>
    request(`/menu/items${availableOnly ? '?available_only=true' : ''}`),
  createItem: (body) => request('/menu/items', { method: 'POST', body: JSON.stringify(body) }),
  updateItem: (id, body) =>
    request(`/menu/items/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  toggleAvailability: (id, available) =>
    request(`/menu/items/${id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ available }),
    }),
  deleteItem: (id) => request(`/menu/items/${id}`, { method: 'DELETE' }),
};

export const tableApi = {
  getAll: () => request('/tables'),
};

export const orderApi = {
  getAll: (params = '') => request(`/orders${params}`),
  get: (id) => request(`/orders/${id}`),
  create: (body) => request('/orders', { method: 'POST', body: JSON.stringify(body) }),
  addItem: (orderId, body) =>
    request(`/orders/${orderId}/items`, { method: 'POST', body: JSON.stringify(body) }),
  updateItem: (orderId, itemId, body) =>
    request(`/orders/${orderId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  removeItem: (orderId, itemId) =>
    request(`/orders/${orderId}/items/${itemId}`, { method: 'DELETE' }),
  updateStatus: (id, status) =>
    request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  transferTable: (id, table_id) =>
    request(`/orders/${id}/transfer-table`, {
      method: 'PATCH',
      body: JSON.stringify({ table_id }),
    }),
  merge: (source_order_ids, target_order_id) =>
    request('/orders/merge', {
      method: 'POST',
      body: JSON.stringify({ source_order_ids, target_order_id }),
    }),
  cancel: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),
  recommendations: (id) => request(`/orders/${id}/recommendations`, { method: 'POST' }),
};

export const paymentApi = {
  pay: (body) => request('/payments', { method: 'POST', body: JSON.stringify(body) }),
  split: (body) => request('/payments/split', { method: 'POST', body: JSON.stringify(body) }),
  receipt: (orderId) => request(`/payments/receipt/${orderId}`),
};

export const dashboardApi = {
  summary: () => request('/dashboard/summary'),
  insights: () => request('/dashboard/insights'),
};
