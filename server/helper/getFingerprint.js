import crypto from "crypto";

function getFingerprint(error) {
  const base = error.message + JSON.stringify(error.stack?.[0] || {});
  return crypto.createHash("md5").update(base).digest("hex");
}

export default getFingerprint;
