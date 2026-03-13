import { defineMiddleware } from "astro:middleware";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./lib/auth";

const STATIC_PREFIXES = ["/_astro/", "/assets/", "/icons/", "/images/"];
const STATIC_EXACT = new Set(["/robots.txt", "/manifest.webmanifest", "/apple-touch-icon.png", "/favicon.ico"]);
const FAVICON_PNG_PATTERN = /^\/favicon-[^/]+\.png$/i;
const PUBLIC_ROUTES = new Set(["/", "/help"]);

// Primary domain for Ansiversa (used to build the root app URL)
const COOKIE_DOMAIN =
  import.meta.env.ANSIVERSA_COOKIE_DOMAIN ?? (import.meta.env.DEV ? "localhost" : "ansiversa.com");

// Root app URL
const ROOT_APP_URL =
  import.meta.env.PUBLIC_ROOT_APP_URL ??
  (import.meta.env.DEV ? "http://localhost:2000" : `https://${COOKIE_DOMAIN}`);

const readEnvValue = (key: string) => {
  const processValue = (globalThis as any).process?.env?.[key];
  if (typeof processValue === "string" && processValue.trim()) {
    return processValue.trim();
  }

  const metaValue = (import.meta.env as Record<string, unknown>)[key];
  if (typeof metaValue === "string" && metaValue.trim()) {
    return metaValue.trim();
  }

  return "";
};

const DEV_AUTH_BYPASS_ENABLED =
  import.meta.env.DEV &&
  readEnvValue("DEV_AUTH_BYPASS").toLowerCase() === "true";
const DEV_AUTH_BYPASS_USER_ID = readEnvValue("DEV_AUTH_BYPASS_USER_ID") || "local-dev-user";
const DEV_AUTH_BYPASS_EMAIL = readEnvValue("DEV_AUTH_BYPASS_EMAIL") || "local-dev@ansiversa.local";
const DEV_AUTH_BYPASS_NAME = readEnvValue("DEV_AUTH_BYPASS_NAME") || "Local Dev User";

const isStaticPath = (pathname: string) => {
  if (STATIC_EXACT.has(pathname) || FAVICON_PNG_PATTERN.test(pathname)) return true;
  return STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
};

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, locals, url } = context;
  const pathname = url.pathname;

  if (isStaticPath(pathname)) {
    return next();
  }

  // Ensure predictable shape
  locals.user = locals.user ?? undefined;
  locals.sessionToken = null;
  locals.isAuthenticated = false;
  locals.rootAppUrl = ROOT_APP_URL;

  // 1) Read the shared session cookie
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const payload = verifySessionToken(token);

    if (payload?.userId) {
      locals.user = {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
        roleId: payload.roleId ?? undefined,
        stripeCustomerId: payload.stripeCustomerId ?? undefined,
      };

      locals.sessionToken = token;
      locals.isAuthenticated = true;
    } else {
      locals.user = undefined;
      locals.sessionToken = null;
      locals.isAuthenticated = false;
    }
  }

  if (!locals.isAuthenticated && DEV_AUTH_BYPASS_ENABLED) {
    // Local-only fallback to unblock mini-app development when shared auth is unavailable.
    locals.user = {
      id: DEV_AUTH_BYPASS_USER_ID,
      email: DEV_AUTH_BYPASS_EMAIL,
      name: DEV_AUTH_BYPASS_NAME,
    };
    locals.sessionToken = null;
    locals.isAuthenticated = true;
  }

  if (!locals.isAuthenticated && !PUBLIC_ROUTES.has(pathname)) {
    const loginUrl = new URL("/login", ROOT_APP_URL);
    loginUrl.searchParams.set("returnTo", url.toString());
    return context.redirect(loginUrl.toString());
  }

  return next();
});
