const exactPaths = new Set([
  "/home",
  "/assessments",
  "/labs",
  "/feed",
  "/my",
  "/map",
]);
const allowedPrefixes = [
  "/share/",
  "/assessments/",
  "/labs/",
  "/results/",
  "/feed/",
  "/my/",
  "/map/",
];

export function parseNuangAppLink(value) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "nuang.app" ||
      url.port ||
      url.username ||
      url.password
    ) {
      return null;
    }
    if (
      !exactPaths.has(url.pathname) &&
      !allowedPrefixes.some((prefix) => url.pathname.startsWith(prefix))
    ) {
      return null;
    }

    return {
      href: url.toString(),
      path: `${url.pathname}${url.search}${url.hash}`,
    };
  } catch {
    return null;
  }
}

export function isMobileOAuthCallback(value) {
  return parseMobileOAuthCallback(value) !== null;
}

export function parseMobileOAuthCallback(value) {
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      url.hostname === "nuang.app" &&
      !url.port &&
      !url.username &&
      !url.password &&
      url.pathname === "/mobile/auth/callback" &&
      !url.hash
    ) {
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      if (code && !error) return { code, status: "code" };
      if (error && !code) return { error, status: "error" };
    }
    return null;
  } catch {
    return null;
  }
}
