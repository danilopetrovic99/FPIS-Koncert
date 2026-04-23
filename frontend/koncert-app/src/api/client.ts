import axios, { AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5225';

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

export function extractErrorMessage(err: unknown, fallback = 'Došlo je do greške.'): string {
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<{ message?: string }>;
    const apiMsg = e.response?.data?.message;
    if (apiMsg) return apiMsg;
    if (e.code === 'ERR_NETWORK') return 'Ne mogu da se povežem na server. Proveri da li API radi.';
    return e.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
