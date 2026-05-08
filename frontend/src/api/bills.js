import api from './axios';

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const getDashboardSummary = (params) => api.get('/dashboard/summary', { params }).then((r) => r.data);

// ── Bills ─────────────────────────────────────────────────────────────────────

export const getBills = (params) => api.get('/bills', { params }).then((r) => r.data);

export const getBillStats = () => api.get('/bills/stats').then((r) => r.data);

export const getBill = (id) => api.get(`/bills/${id}`).then((r) => r.data);

export const createBill = (data) => api.post('/bills', data).then((r) => r.data);

export const updateBill = (id, data) => api.put(`/bills/${id}`, data).then((r) => r.data);

export const deleteBill = (id) => api.delete(`/bills/${id}`).then((r) => r.data);

export const searchByTicket = (ticket) =>
  api.get('/bills/search', { params: { ticket } }).then((r) => r.data);

export const getBillerSuggestions = (categoryId) =>
  api.get('/bills/suggestions', { params: { category_id: categoryId } }).then((r) => r.data);

// ── Payments ──────────────────────────────────────────────────────────────────

export const getPayments = (billId) =>
  api.get(`/bills/${billId}/payments`).then((r) => r.data);

export const addPayment = (billId, data) => {
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v) && v.length > 0 && v[0] instanceof File) {
      v.forEach((file, i) => form.append(`${k}[${i}]`, file));
    } else if (!Array.isArray(v)) {
      form.append(k, v);
    }
  });
  return api.post(`/bills/${billId}/payments`, form).then((r) => r.data);
};

export const updatePayment = (billId, paymentId, data) => {
  const form = new FormData();
  form.append('_method', 'PUT');
  Object.entries(data).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v) && v.length > 0 && v[0] instanceof File) {
      v.forEach((file, i) => form.append(`${k}[${i}]`, file));
    } else if (!Array.isArray(v)) {
      form.append(k, v);
    }
  });
  return api.post(`/bills/${billId}/payments/${paymentId}`, form).then((r) => r.data);
};

export const deletePayment = (billId, paymentId) =>
  api.delete(`/bills/${billId}/payments/${paymentId}`).then((r) => r.data);

// ── Categories ────────────────────────────────────────────────────────────────

export const getCategories = () => api.get('/categories').then((r) => r.data);

export const createCategory = (data) => {
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v) && v.length > 0 && v[0] instanceof File) {
      v.forEach((file, i) => form.append(`${k}[${i}]`, file));
    } else if (!Array.isArray(v)) {
      form.append(k, v);
    }
  });
  return api.post('/categories', form).then((r) => r.data);
};

export const updateCategory = (id, data) => {
  const form = new FormData();
  form.append('_method', 'PUT');
  Object.entries(data).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v) && v.length > 0 && v[0] instanceof File) {
      v.forEach((file, i) => form.append(`${k}[${i}]`, file));
    } else if (!Array.isArray(v)) {
      form.append(k, v);
    }
  });
  return api.post(`/categories/${id}`, form).then((r) => r.data);
};

export const deleteCategory = (id) => api.delete(`/categories/${id}`).then((r) => r.data);

// ── Payment Channels ──────────────────────────────────────────────────────────

export const getChannels = () => api.get('/payment-channels').then((r) => r.data);

export const createChannel = (data) => api.post('/payment-channels', data).then((r) => r.data);

export const updateChannel = (id, data) =>
  api.put(`/payment-channels/${id}`, data).then((r) => r.data);

export const deleteChannel = (id) => api.delete(`/payment-channels/${id}`).then((r) => r.data);

// ── Tubo ──────────────────────────────────────────────────────────────────────

export const getTuboSummary = (params) => api.get('/tubo/summary', { params }).then((r) => r.data);
