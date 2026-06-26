(function () {
  'use strict';

  const TOKEN_KEY = 'zx_auth_token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function syncLocalUser(account) {
    if (!account) return;
    localStorage.setItem('zx_user_data', JSON.stringify({
      nick: account.nick,
      email: account.email,
      birthdate: account.birthdate,
      phone: account.phone,
      friendCode: account.friendCode,
      ageGroup: account.ageGroup,
      registeredAt: account.registeredAt,
    }));
    localStorage.setItem('zx_username', account.nick);
    localStorage.setItem('userNickname', account.nick);
    localStorage.setItem('username', account.nick);
    localStorage.setItem('zx_session', 'authenticated');
    // Sincronizar avatar do servidor para o localStorage
    if (account.avatar) {
      localStorage.setItem('zx_avatar', account.avatar);
    }
  }

  function clearLocalSession() {
    localStorage.removeItem('zx_auth_token');
    localStorage.removeItem('zx_session');
    localStorage.removeItem('zx_username');
    localStorage.removeItem('userNickname');
    localStorage.removeItem('username');
    localStorage.removeItem('zx_user_data');
  }

  async function request(path, options = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    const token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    let res;
    try {
      res = await fetch(path, Object.assign({}, options, { headers, signal: controller.signal }));
    } finally {
      clearTimeout(timeoutId);
    }
    let data = {};
    try {
      data = await res.json();
    } catch (_) {}

    if (!res.ok) {
      throw new Error(data.error || 'Erro na requisição');
    }
    return data;
  }

  async function register(payload) {
    const data = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setToken(data.token);
    syncLocalUser(data.account);
    return data;
  }

  async function login(payload) {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setToken(data.token);
    syncLocalUser(data.account);
    return data;
  }

  async function getProfile() {
    const data = await request('/api/account/me');
    syncLocalUser(data.account);
    return data.account;
  }

  async function updateProfile(payload) {
    const data = await request('/api/account', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    syncLocalUser(data.account);
    return data.account;
  }

  async function logout() {
    try {
      await request('/api/account/logout', { method: 'POST', body: '{}' });
    } catch (_) {}
    clearLocalSession();
  }

  async function deleteAccount(password) {
    await request('/api/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
    clearLocalSession();
  }

  window.AccountAPI = {
    getToken,
    setToken,
    syncLocalUser,
    clearLocalSession,
    register,
    login,
    getProfile,
    updateProfile,
    logout,
    deleteAccount,
  };
})();
