const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";

function getToken() {
  return localStorage.getItem("laundry_token");
}

export function setSession(token, user, shopName) {
  localStorage.setItem("laundry_token", token);
  localStorage.setItem("laundry_user", JSON.stringify(user));
  if (shopName) localStorage.setItem("laundry_shop_name", shopName);
}

export function clearSession() {
  localStorage.removeItem("laundry_token");
  localStorage.removeItem("laundry_user");
  localStorage.removeItem("laundry_shop_name");
}

export function getCurrentUser() {
  const raw = localStorage.getItem("laundry_user");
  return raw ? JSON.parse(raw) : null;
}

export function getShopName() {
  return localStorage.getItem("laundry_shop_name") || "Laundry Manager";
}

export function isLoggedIn() {
  return Boolean(getToken());
}

async function request(path, { method = "GET", body, auth = true, query } = {}) {
  let url = `${API_BASE_URL}${path}`;
  if (query) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ""))
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (res.status === 401 && auth) {
    clearSession();
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    throw new Error((data && (data.error || data.message)) || `Request failed (${res.status})`);
  }

  return data;
}

export const api = {
  login: (username, password) => request("/auth/login", { method: "POST", body: { username, password }, auth: false }),

  findCustomer: (phone) => request("/customer/find", { query: { phone } }),
  createCustomer: (payload) => request("/customer/create", { method: "POST", body: payload }),

  createOrder: (payload) => request("/order/create", { method: "POST", body: payload }),
  updateOrderStatus: (payload) => request("/order/update-status", { method: "POST", body: payload }),
  getOrderByQr: (data) => request("/order/get-by-qr", { query: { data } }),
  listOrders: (status, q) => request("/order/list", { query: { status, q, limit: 200 } }),
  getOrderStats: () => request("/order/stats"),

  generateUpiQr: (order_number, amount) =>
    request("/payment/generate-upi-qr", { method: "POST", body: { order_number, amount } }),

  getRateCard: () => request("/rate-card"),

  // Public - no auth token attached, safe to call from the customer-facing
  // tracking page.
  getPublicOrder: (orderNumber) => request(`/public/order/${orderNumber}`, { auth: false }),
};

export { API_BASE_URL };
