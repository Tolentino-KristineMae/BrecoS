import api from './axios';

export const getCashTransactions = (params) =>
  api.get('/cash', { params }).then((r) => r.data);

export const getCashTransaction = (id) =>
  api.get(`/cash/${id}`).then((r) => r.data);

export const createCashTransaction = (data) => {
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v) && v.length > 0 && v[0] instanceof File) {
      v.forEach((file) => form.append(`${k}[]`, file));
    } else if (!Array.isArray(v)) {
      form.append(k, v);
    }
  });
  return api.post('/cash', form).then((r) => r.data);
};

export const updateCashTransaction = (id, data) => {
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v) && v.length > 0 && v[0] instanceof File) {
      v.forEach((file) => form.append(`${k}[]`, file));
    } else if (!Array.isArray(v)) {
      form.append(k, v);
    }
  });
  return api.post(`/cash/${id}`, form, {
    headers: {
      'X-HTTP-Method-Override': 'PUT',
    },
  }).then((r) => r.data);
};

export const deleteCashTransaction = (id) =>
  api.delete(`/cash/${id}`).then((r) => r.data);

export const deleteCashFile = (txnId, fileId) =>
  api.delete(`/cash/${txnId}/files/${fileId}`).then((r) => r.data);

export const getCashSummary = (params) =>
  api.get('/cash/summary', { params }).then((r) => r.data);
