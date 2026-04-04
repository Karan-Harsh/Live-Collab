const fallbackApiUrl = 'http://localhost:4000';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? fallbackApiUrl).replace(/\/$/, '');

export const SOCKET_URL = API_URL;
