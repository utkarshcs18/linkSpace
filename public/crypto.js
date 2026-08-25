const LSCrypto = (() => {
  const DB_NAME = "linkspace-vault";
  const STORE = "identity";
  const INFO = new TextEncoder().encode("linkspace-e2ee-v1");

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE, { keyPath: "email" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function putIdentity(record) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getIdentity(email) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(email.toLowerCase());
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  function bufToB64(buf) {
    const bytes = new Uint8Array(buf);
    let str = "";
    bytes.forEach((b) => {
      str += String.fromCharCode(b);
    });
    return btoa(str);
  }

  function b64ToBuf(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  async function generateIdentity(email) {
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"]
    );
    const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    delete publicJwk.d;
    publicJwk.key_ops = [];
    const record = {
      email: email.toLowerCase(),
      publicJwk,
      privateJwk,
      createdAt: new Date().toISOString(),
    };
    await putIdentity(record);
    return record;
  }

  async function ensureIdentity(email) {
    const existing = await getIdentity(email);
    if (existing?.privateJwk && existing?.publicJwk) return existing;
    return generateIdentity(email);
  }

  async function importBackup(json, emailHint) {
    const data = typeof json === "string" ? JSON.parse(json) : json;
    if (!data?.privateJwk?.d || !data?.publicJwk?.x) {
      throw new Error("Invalid key backup");
    }
    const email = (data.email || emailHint || "").toLowerCase();
    if (!email) throw new Error("Backup is missing email");
    await putIdentity({
      email,
      publicJwk: data.publicJwk,
      privateJwk: data.privateJwk,
      createdAt: data.createdAt || new Date().toISOString(),
    });
    return email;
  }

  async function exportBackup(email) {
    const rec = await getIdentity(email);
    if (!rec) throw new Error("No identity on this device");
    return JSON.stringify(rec, null, 2);
  }

  const pubKeyCache = new Map();
  const privKeyCache = new Map();

  function pubCacheKey(jwk) {
    return `${jwk.x}:${jwk.y}`;
  }

  async function importPrivate(jwk) {
    const id = jwk.d;
    if (privKeyCache.has(id)) return privKeyCache.get(id);
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      ["deriveBits"]
    );
    privKeyCache.set(id, key);
    return key;
  }

  async function importPublic(jwk) {
    const id = pubCacheKey(jwk);
    if (pubKeyCache.has(id)) return pubKeyCache.get(id);
    const clean = { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, ext: true };
    const key = await crypto.subtle.importKey("jwk", clean, { name: "ECDH", namedCurve: "P-256" }, false, []);
    pubKeyCache.set(id, key);
    return key;
  }

  async function deriveAesKey(privateKey, publicKey, saltBytes) {
    const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
    const hkdfKey = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: saltBytes,
        info: INFO,
      },
      hkdfKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptFor(myPrivateJwk, theirPublicJwk, plaintext) {
    const myPriv = await importPrivate(myPrivateJwk);
    const theirPub = await importPublic(theirPublicJwk);
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const aesKey = await deriveAesKey(myPriv, theirPub, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoded);
    return {
      ciphertext: bufToB64(ct),
      iv: bufToB64(iv),
      ephemeralPublicKey: JSON.stringify({ salt: bufToB64(salt) }),
    };
  }

  async function decryptWith(myPrivateJwk, theirPublicJwk, payload) {
    const myPriv = await importPrivate(myPrivateJwk);
    const theirPub = await importPublic(theirPublicJwk);
    const meta = JSON.parse(payload.ephemeralPublicKey);
    const salt = new Uint8Array(b64ToBuf(meta.salt));
    const aesKey = await deriveAesKey(myPriv, theirPub, salt);
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(b64ToBuf(payload.iv)) },
      aesKey,
      b64ToBuf(payload.ciphertext)
    );
    return new TextDecoder().decode(pt);
  }

  async function safetyNumber(pubA, pubB) {
    const a = `${pubA.x}:${pubA.y}`;
    const b = `${pubB.x}:${pubB.y}`;
    const ordered = [a, b].sort().join("|");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ordered));
    const hex = [...new Uint8Array(digest)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 12)
      .toUpperCase();
    return hex.replace(/(.{4})/g, "$1 ").trim();
  }

  return {
    ensureIdentity,
    getIdentity,
    generateIdentity,
    importBackup,
    exportBackup,
    encryptFor,
    decryptWith,
    safetyNumber,
  };
})();
