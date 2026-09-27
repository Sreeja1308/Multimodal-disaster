export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

export async function safeFetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}
