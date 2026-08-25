function isBase64(value) {
  return (
    typeof value === "string" &&
    value.length >= 8 &&
    value.length < 2_000_000 &&
    /^[A-Za-z0-9+/]+=*$/.test(value)
  );
}

function isCipherPayload(body) {
  if (!isBase64(body?.ciphertext) || !isBase64(body?.iv)) return false;
  try {
    const meta = JSON.parse(body.ephemeralPublicKey);
    return typeof meta.salt === "string" && isBase64(meta.salt);
  } catch {
    return false;
  }
}

module.exports = { isBase64, isCipherPayload };
