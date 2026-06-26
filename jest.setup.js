require('@testing-library/jest-dom');
const { toHaveNoViolations } = require('jest-axe');
expect.extend(toHaveNoViolations);

// Polyfill the Request global for Next.js server-side modules (sitemap, robots).
// jsdom does not expose Request out of the box, but next/server depends on it.
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      this.url = input;
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
      this.body = init?.body || null;
    }
  };
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this._body = body;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || 'OK';
      this.headers = new Headers(init?.headers);
      this.ok = this.status >= 200 && this.status < 300;
    }
    async text() {
      return String(this._body);
    }
    async json() {
      return JSON.parse(this._body);
    }
  };
}

if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
      this._headers = {};
      if (init) {
        for (const [key, value] of Object.entries(init)) {
          this._headers[key.toLowerCase()] = String(value);
        }
      }
    }
    get(name) {
      return this._headers[name.toLowerCase()] || null;
    }
    set(name, value) {
      this._headers[name.toLowerCase()] = String(value);
    }
    forEach(callback) {
      for (const [key, value] of Object.entries(this._headers)) {
        callback(value, key, this);
      }
    }
  };
}
