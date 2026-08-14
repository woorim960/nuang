import assert from "node:assert/strict";
import test from "node:test";
import {
  createMemoryStorage,
  createSecureSessionStorage,
} from "../src/secure-session-storage.js";

test("initializes a device-only, non-synchronized secure session namespace once", async () => {
  const calls = [];
  const values = new Map();
  const secureStorage = {
    async clear(sync) {
      calls.push(["clear", sync]);
      values.clear();
    },
    async getItem(key) {
      calls.push(["get", key]);
      return values.get(key) ?? null;
    },
    async removeItem(key) {
      calls.push(["remove", key]);
      values.delete(key);
    },
    async setDefaultKeychainAccess(access) {
      calls.push(["access", access]);
    },
    async setItem(key, value) {
      calls.push(["set", key, value]);
      values.set(key, value);
    },
    async setKeyPrefix(prefix) {
      calls.push(["prefix", prefix]);
    },
    async setSynchronize(sync) {
      calls.push(["sync", sync]);
    },
  };
  const storage = createSecureSessionStorage({
    access: 1,
    secureStorage,
  });

  await storage.setItem("session", "secret");
  assert.equal(await storage.getItem("session"), "secret");
  await storage.removeItem("session");
  await storage.clear();

  assert.deepEqual(calls.slice(0, 3), [
    ["prefix", "nuang.auth."],
    ["sync", false],
    ["access", 1],
  ]);
  assert.equal(calls.filter(([name]) => name === "prefix").length, 1);
  assert.deepEqual(calls.at(-1), ["clear", false]);
});

test("rejects invalid keys and non-string session values", async () => {
  const noOp = async () => undefined;
  const storage = createSecureSessionStorage({
    access: 1,
    secureStorage: {
      clear: noOp,
      getItem: noOp,
      removeItem: noOp,
      setDefaultKeychainAccess: noOp,
      setItem: noOp,
      setKeyPrefix: noOp,
      setSynchronize: noOp,
    },
  });

  await assert.rejects(storage.getItem(""), TypeError);
  await assert.rejects(storage.setItem("session", {}), TypeError);
});

test("uses an in-memory fallback without browser persistence", async () => {
  const storage = createMemoryStorage();
  await storage.setItem("pkce", "value");
  assert.equal(await storage.getItem("pkce"), "value");
  await storage.clear();
  assert.equal(await storage.getItem("pkce"), null);
});

test("clears a surviving Keychain session on a fresh app installation", async () => {
  const calls = [];
  const markers = new Map();
  const secureValues = new Map([["session", "stale-after-uninstall"]]);
  const secureStorage = {
    async clear(sync) {
      calls.push(["clear", sync]);
      secureValues.clear();
    },
    async getItem(key) {
      return secureValues.get(key) ?? null;
    },
    async removeItem(key) {
      secureValues.delete(key);
    },
    async setDefaultKeychainAccess() {},
    async setItem(key, value) {
      secureValues.set(key, value);
    },
    async setKeyPrefix() {},
    async setSynchronize() {},
  };
  const installationMarker = {
    async getItem(key) {
      return markers.get(key) ?? null;
    },
    async setItem(key, value) {
      markers.set(key, value);
    },
  };

  const firstLaunch = createSecureSessionStorage({
    access: 1,
    installationMarker,
    secureStorage,
  });
  assert.equal(await firstLaunch.getItem("session"), null);
  assert.deepEqual(calls, [["clear", false]]);
  await firstLaunch.setItem("session", "current-installation");

  const nextLaunch = createSecureSessionStorage({
    access: 1,
    installationMarker,
    secureStorage,
  });
  assert.equal(await nextLaunch.getItem("session"), "current-installation");
  assert.deepEqual(calls, [["clear", false]]);
});

test("keeps secure storage usable for the current launch when the marker cannot be written", async () => {
  const values = new Map([["session", "stale"]]);
  const storage = createSecureSessionStorage({
    access: 1,
    installationMarker: {
      async getItem() {
        throw new Error("blocked");
      },
      async setItem() {
        throw new Error("blocked");
      },
    },
    secureStorage: {
      async clear() { values.clear(); },
      async getItem(key) { return values.get(key) ?? null; },
      async removeItem(key) { values.delete(key); },
      async setDefaultKeychainAccess() {},
      async setItem(key, value) { values.set(key, value); },
      async setKeyPrefix() {},
      async setSynchronize() {},
    },
  });

  assert.equal(await storage.getItem("session"), null);
  await storage.setItem("session", "current-launch");
  assert.equal(await storage.getItem("session"), "current-launch");
});
