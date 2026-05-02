const getApiBase = () => {
  const value = document
    .querySelector('meta[name="edueats-api-base"]')
    ?.getAttribute('content')
    ?.trim();

  if (!value) return '/api';
  if (value.endsWith('/api')) return value;
  return `${value.replace(/\/+$/, '')}/api`;
};

const BASE = getApiBase();

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}
