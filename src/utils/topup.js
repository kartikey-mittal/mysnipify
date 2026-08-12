// Dodo Payments top-up helper — calls the deployed Cloudflare Worker.
// The Dodo secret key stays on the worker (never ships in the browser).
const WORKER_URL = 'https://dodopayment.g6-kartikey.workers.dev';

const post = async (path, data) => {
  const res = await fetch(`${WORKER_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload.error || `Request failed with status ${res.status}`);
  }
  return { data: payload };
};

export const createTopup = (data) => post('/api/create-topup', data);
export const verifyTopup = (data) => post('/api/verify-topup', data);