// Dimuat paling awal oleh setiap file test: database di memori dan mode test.
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';

const { loadConfig } = require('../src/config');
const { createApp } = require('../src/app');

// Menjalankan aplikasi di port acak. Kembalikan { baseUrl, close }.
async function startServer(options = {}) {
  const config = { ...loadConfig(process.env), ...options.config };
  const app = createApp({ ...options, config });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

// Klien HTTP kecil dengan penyimpanan cookie, mewakili satu browser.
class Browser {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = new Map();
    this.csrfToken = null;
  }

  cookieHeader(pathname) {
    const parts = [];
    for (const [name, cookie] of this.cookies) {
      if (pathname === cookie.path || pathname.startsWith(`${cookie.path.replace(/\/$/, '')}/`) || cookie.path === '/') {
        parts.push(`${name}=${cookie.value}`);
      }
    }
    return parts.join('; ');
  }

  storeCookies(response) {
    for (const header of response.headers.getSetCookie()) {
      const [pair, ...attributes] = header.split(';').map((part) => part.trim());
      const index = pair.indexOf('=');
      const name = pair.slice(0, index);
      const value = pair.slice(index + 1);
      const pathAttr = attributes.find((attr) => /^path=/i.test(attr));
      const expired = attributes.some((attr) => /^max-age=0$/i.test(attr) || /^expires=thu, 01 jan 1970/i.test(attr));
      if (expired || value === '') {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, { value, path: pathAttr ? pathAttr.slice(5) : '/' });
      }
    }
  }

  async request(pathname, { method = 'GET', form, headers = {} } = {}) {
    const url = new URL(pathname, this.baseUrl);
    const init = { method, redirect: 'manual', headers: { ...headers } };
    const cookie = this.cookieHeader(url.pathname);
    if (cookie) init.headers.cookie = cookie;
    if (form) {
      init.headers['content-type'] = 'application/x-www-form-urlencoded';
      init.body = new URLSearchParams(form).toString();
    }
    const response = await fetch(url, init);
    this.storeCookies(response);
    const text = await response.text();
    const token = /name="_csrf" value="([^"]+)"/.exec(text);
    if (token) this.csrfToken = token[1];
    return { status: response.status, headers: response.headers, text };
  }

  get(pathname, options) {
    return this.request(pathname, options);
  }

  // Mengirim form seperti browser sungguhan: token CSRF diambil dari halaman
  // terakhir yang dibuka. `csrf: false` untuk menguji request tanpa token.
  async post(pathname, form = [], { csrf = true, ...options } = {}) {
    const fields = Array.isArray(form) ? [...form] : Object.entries(form);
    if (csrf && !fields.some(([name]) => name === '_csrf')) {
      if (!this.csrfToken) await this.get('/agenda/baru');
      fields.push(['_csrf', this.csrfToken]);
    }
    return this.request(pathname, { ...options, method: 'POST', form: fields });
  }
}

// Nilai datetime-local (WIB) untuk beberapa hari ke depan.
function futureLocal(daysAhead, hour = 19, minute = 0) {
  const date = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000);
  const day = date.toISOString().slice(0, 10);
  return `${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// Isian form agenda yang valid. Nilai di `overrides` menggantikan field
// dengan nama yang sama; field baru ditambahkan di akhir.
function agendaForm(overrides = {}) {
  const base = [
    ['title', 'Mabar ranked Sabtu'],
    ['kind', 'mabar'],
    ['description', ''],
    ['location', 'Discord'],
    ['timezone', 'Asia/Jakarta'],
    ['start', futureLocal(2, 19)],
    ['end', futureLocal(2, 22)],
    ['start', futureLocal(3, 20)],
    ['end', futureLocal(3, 23)],
  ];
  const fields = base.filter(([name]) => !Object.hasOwn(overrides, name));
  return [...fields, ...Object.entries(overrides)];
}

module.exports = { startServer, Browser, futureLocal, agendaForm };
