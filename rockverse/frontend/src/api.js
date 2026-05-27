const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const request = async (path, options = {}) => {
  const token = localStorage.getItem("rockverse_token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Erro na requisição");
  }

  return data;
};
