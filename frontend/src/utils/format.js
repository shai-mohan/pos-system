export const formatMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

export const ORDER_STATUS_LABELS = {
  new: 'New',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  awaiting_payment: 'Awaiting Payment',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

export const TABLE_STATUS_LABELS = {
  available: 'Available',
  occupied: 'Occupied',
  awaiting_payment: 'Awaiting Payment',
};
