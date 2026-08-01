export const authSessionMaxAgeSeconds = 30 * 24 * 60 * 60;

export const supabaseAuthCookieOptions = {
  maxAge: authSessionMaxAgeSeconds,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
