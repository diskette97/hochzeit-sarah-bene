export const isConfigured = () => Boolean(process.env.DATABASE_URL);
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const COOKIE_NAME = "hz_session";
