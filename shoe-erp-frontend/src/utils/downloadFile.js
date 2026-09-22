import api from '../api/axiosInstance'

export const downloadFile = async (url, filename) => {
  const token = localStorage.getItem('token');
  
  let fullUrl = url;
  if (url.startsWith('/api')) {
    const base = api.defaults.baseURL || '/api';
    if (base.endsWith('/api')) {
      fullUrl = `${base}${url.slice(4)}`;
    } else {
      fullUrl = `${base}${url}`;
    }
  } else if (!url.startsWith('http')) {
    const base = api.defaults.baseURL || '/api';
    fullUrl = `${base}/${url.replace(/^\//, '')}`;
  }

  const response = await fetch(fullUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!response.ok) {
    throw new Error('Failed to download file');
  }

  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
