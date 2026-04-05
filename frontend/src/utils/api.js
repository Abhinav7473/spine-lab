// Base fetch wrapper — all API calls go through here.
// Vite proxies /api/* to http://localhost:8000/*

const BASE = '/api'

async function request(method, path, body, extraHeaders = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${path}: ${text}`)
  }

  return res.json()
}

export const api = {
  get:    (path, headers)       => request('GET',   path, undefined, headers),
  post:   (path, body, headers) => request('POST',  path, body,      headers),
  patch:  (path, body, headers) => request('PATCH', path, body,      headers),
}
