const defaultPrefix = "nuang.auth.";
const defaultInstallationMarkerKey = "nuang.native-installation.v1";

export function createMemoryStorage() {
  const values = new Map();
  return {
    async clear() {
      values.clear();
    },
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async removeItem(key) {
      values.delete(key);
    },
    async setItem(key, value) {
      values.set(key, value);
    },
  };
}

export function createSecureSessionStorage({
  access,
  installationMarker,
  installationMarkerKey = defaultInstallationMarkerKey,
  keyPrefix = defaultPrefix,
  secureStorage,
}) {
  let initialization;

  async function initialize() {
    initialization ??= (async () => {
      await secureStorage.setKeyPrefix(keyPrefix);
      await secureStorage.setSynchronize(false);
      await secureStorage.setDefaultKeychainAccess(access);
      await reconcileInstallation({
        installationMarker,
        installationMarkerKey,
        secureStorage,
      });
    })();
    return initialization;
  }

  return {
    async clear() {
      await initialize();
      await secureStorage.clear(false);
    },
    async getItem(key) {
      assertStorageKey(key);
      await initialize();
      return secureStorage.getItem(key);
    },
    async removeItem(key) {
      assertStorageKey(key);
      await initialize();
      await secureStorage.removeItem(key);
    },
    async setItem(key, value) {
      assertStorageKey(key);
      if (typeof value !== "string") {
        throw new TypeError("Secure session values must be strings.");
      }
      await initialize();
      await secureStorage.setItem(key, value);
    },
  };
}

async function reconcileInstallation({
  installationMarker,
  installationMarkerKey,
  secureStorage,
}) {
  if (!installationMarker) return;

  let marker = null;
  try {
    marker = await installationMarker.getItem(installationMarkerKey);
  } catch {
    // If the non-secret marker cannot be read, fail closed by dropping the session.
  }
  if (marker) return;

  await secureStorage.clear(false);
  try {
    await installationMarker.setItem(installationMarkerKey, "initialized");
  } catch {
    // The current launch may continue, but a later launch will fail closed again.
  }
}

function assertStorageKey(key) {
  if (typeof key !== "string" || !key.trim()) {
    throw new TypeError("Secure session keys must be non-empty strings.");
  }
}
