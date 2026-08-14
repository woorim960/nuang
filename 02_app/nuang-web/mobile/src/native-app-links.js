import { App } from "@capacitor/app";
import {
  parseMobileOAuthCallback,
  parseNuangAppLink,
} from "./app-link-contract.js";

export async function installNativeAppLinks({ onNavigate, onOAuthCallback }) {
  const handle = (value, source) => {
    const oauth = parseMobileOAuthCallback(value);
    if (oauth) {
      invokeSafely(onOAuthCallback, { ...oauth, source });
      return;
    }
    const link = parseNuangAppLink(value);
    if (link) invokeSafely(onNavigate, { ...link, source });
  };

  const launch = await App.getLaunchUrl().catch(() => null);
  if (launch?.url) handle(launch.url, "cold_start");

  return App.addListener("appUrlOpen", ({ url }) => handle(url, "resume"));
}

function invokeSafely(callback, payload) {
  try {
    void Promise.resolve(callback(payload)).catch(() => undefined);
  } catch {
    // Native listener callbacks must never become unhandled bridge errors.
  }
}
