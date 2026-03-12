import crypto from "node:crypto";
import { base64UrlEncode, base64UrlToBuffer, clampText, randomId } from "./common.js";

const COSE_KEY_KTY = 1;
const COSE_KEY_ALG = 3;
const COSE_KEY_CRV = -1;
const COSE_KEY_X = -2;
const COSE_KEY_Y = -3;
const COSE_KTY_EC2 = 2;
const COSE_CRV_P256 = 1;
const COSE_ALG_ES256 = -7;
const FLAG_USER_PRESENT = 0x01;
const FLAG_USER_VERIFIED = 0x04;
const FLAG_ATTESTED_CREDENTIAL_DATA = 0x40;
const P256_SPKI_PREFIX = Buffer.from("3059301306072A8648CE3D020106082A8648CE3D03010703420004", "hex");

export function isPasskeyOriginAllowed(originValue) {
  if (!originValue) {
    return false;
  }
  try {
    const origin = new URL(originValue);
    return (
      origin.protocol === "https:" ||
      origin.hostname === "localhost" ||
      origin.hostname === "127.0.0.1" ||
      origin.hostname === "::1" ||
      origin.hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

export function getPasskeyConfig(config) {
  const origin = String(config.publicOrigin || "").trim();
  const derived = origin ? new URL(origin) : null;
  const rpId = String(config.auth?.passkeys?.rpId || derived?.hostname || "").trim();
  return {
    enabled: config.auth?.passkeys?.enabled !== false && isPasskeyOriginAllowed(origin) && !!rpId,
    origin,
    rpId,
    rpName: String(config.auth?.passkeys?.rpName || config.web?.appName || "Mobile Codex").slice(0, 120),
    timeoutMs: Math.max(15000, Math.min(Number(config.auth?.passkeys?.timeoutMs || 60000), 300000)),
    challengeTtlMs: Math.max(30000, Math.min(Number(config.auth?.passkeys?.challengeTtlMs || 300000), 900000)),
    userVerification: ["discouraged", "preferred", "required"].includes(config.auth?.passkeys?.userVerification)
      ? config.auth.passkeys.userVerification
      : "preferred"
  };
}

export function randomChallenge() {
  return base64UrlEncode(crypto.randomBytes(32));
}

export function issueChallenge(store, ttlMs, payload = {}) {
  const challengeId = randomId("webauthn");
  const challenge = randomChallenge();
  store.set(challengeId, {
    challenge,
    expiresAt: Date.now() + ttlMs,
    ...payload
  });
  return {
    challengeId,
    challenge
  };
}

export function cleanupChallengeStore(store) {
  const now = Date.now();
  for (const [id, value] of store.entries()) {
    if (!value || value.expiresAt <= now) {
      store.delete(id);
    }
  }
}

function createDecodeState(buffer) {
  return {
    buffer,
    offset: 0
  };
}

function readLength(state, additionalInfo) {
  if (additionalInfo < 24) {
    return additionalInfo;
  }
  if (additionalInfo === 24) {
    return state.buffer.readUInt8(state.offset++);
  }
  if (additionalInfo === 25) {
    const value = state.buffer.readUInt16BE(state.offset);
    state.offset += 2;
    return value;
  }
  if (additionalInfo === 26) {
    const value = state.buffer.readUInt32BE(state.offset);
    state.offset += 4;
    return value;
  }
  if (additionalInfo === 27) {
    const value = Number(state.buffer.readBigUInt64BE(state.offset));
    state.offset += 8;
    return value;
  }
  throw new Error("unsupported-cbor-length");
}

function decodeCborValue(state) {
  const head = state.buffer.readUInt8(state.offset++);
  const majorType = head >> 5;
  const additionalInfo = head & 0x1f;

  if (majorType === 0) {
    return readLength(state, additionalInfo);
  }
  if (majorType === 1) {
    return -1 - readLength(state, additionalInfo);
  }
  if (majorType === 2) {
    const length = readLength(state, additionalInfo);
    const value = state.buffer.subarray(state.offset, state.offset + length);
    state.offset += length;
    return value;
  }
  if (majorType === 3) {
    const length = readLength(state, additionalInfo);
    const value = state.buffer.subarray(state.offset, state.offset + length).toString("utf8");
    state.offset += length;
    return value;
  }
  if (majorType === 4) {
    const length = readLength(state, additionalInfo);
    return Array.from({ length }, () => decodeCborValue(state));
  }
  if (majorType === 5) {
    const length = readLength(state, additionalInfo);
    const value = new Map();
    for (let index = 0; index < length; index += 1) {
      value.set(decodeCborValue(state), decodeCborValue(state));
    }
    return value;
  }
  if (majorType === 6) {
    decodeCborValue(state);
    return decodeCborValue(state);
  }
  if (majorType === 7) {
    if (additionalInfo === 20) {
      return false;
    }
    if (additionalInfo === 21) {
      return true;
    }
    if (additionalInfo === 22) {
      return null;
    }
    throw new Error("unsupported-cbor-simple-value");
  }

  throw new Error("unsupported-cbor-major-type");
}

export function decodeCbor(buffer, options = {}) {
  const state = createDecodeState(Buffer.from(buffer));
  const value = decodeCborValue(state);
  if (!options.allowTrailing && state.offset !== state.buffer.length) {
    throw new Error("unexpected-trailing-cbor-data");
  }
  return value;
}

function parseAuthenticatorData(buffer, expectedRpId) {
  const authData = Buffer.from(buffer);
  if (authData.length < 37) {
    throw new Error("authenticator-data-too-short");
  }

  const rpIdHash = authData.subarray(0, 32);
  const flags = authData.readUInt8(32);
  const signCount = authData.readUInt32BE(33);
  const expectedRpIdHash = crypto.createHash("sha256").update(expectedRpId).digest();
  if (!crypto.timingSafeEqual(rpIdHash, expectedRpIdHash)) {
    throw new Error("rp-id-hash-mismatch");
  }

  const result = {
    rpIdHash,
    flags,
    signCount,
    credentialId: null,
    credentialPublicKeySpki: null
  };

  if (flags & FLAG_ATTESTED_CREDENTIAL_DATA) {
    let offset = 37;
    offset += 16;
    const credentialIdLength = authData.readUInt16BE(offset);
    offset += 2;
    result.credentialId = authData.subarray(offset, offset + credentialIdLength);
    offset += credentialIdLength;
    const credentialPublicKey = decodeCbor(authData.subarray(offset), { allowTrailing: true });
    result.credentialPublicKeySpki = coseEc2ToSpki(credentialPublicKey);
  }

  return result;
}

function coseEc2ToSpki(coseKey) {
  if (!(coseKey instanceof Map)) {
    throw new Error("credential-public-key-not-cose");
  }
  const kty = coseKey.get(COSE_KEY_KTY);
  const alg = coseKey.get(COSE_KEY_ALG);
  const crv = coseKey.get(COSE_KEY_CRV);
  const x = coseKey.get(COSE_KEY_X);
  const y = coseKey.get(COSE_KEY_Y);

  if (kty !== COSE_KTY_EC2 || alg !== COSE_ALG_ES256 || crv !== COSE_CRV_P256) {
    throw new Error("unsupported-public-key-type");
  }
  if (!Buffer.isBuffer(x) || !Buffer.isBuffer(y) || x.length !== 32 || y.length !== 32) {
    throw new Error("invalid-ec2-point");
  }
  return Buffer.concat([P256_SPKI_PREFIX, x, y]);
}

function parseClientData(clientDataJSONBase64Url) {
  const clientDataJSON = base64UrlToBuffer(clientDataJSONBase64Url);
  const clientData = JSON.parse(clientDataJSON.toString("utf8"));
  return {
    clientDataJSON,
    clientData
  };
}

function verifyClientData({ clientData, expectedChallenge, expectedOrigin, expectedType }) {
  if (clientData.type !== expectedType) {
    throw new Error("webauthn-type-mismatch");
  }
  if (clientData.challenge !== expectedChallenge) {
    throw new Error("webauthn-challenge-mismatch");
  }
  if (clientData.origin !== expectedOrigin) {
    throw new Error("webauthn-origin-mismatch");
  }
}

function verifyFlags(flags, userVerification) {
  if (!(flags & FLAG_USER_PRESENT)) {
    throw new Error("user-not-present");
  }
  if (userVerification === "required" && !(flags & FLAG_USER_VERIFIED)) {
    throw new Error("user-not-verified");
  }
}

function assertCredentialIdMatches(rawIdBase64Url, credentialIdBuffer) {
  const rawId = base64UrlToBuffer(rawIdBase64Url);
  if (!credentialIdBuffer || !rawId.equals(credentialIdBuffer)) {
    throw new Error("credential-id-mismatch");
  }
}

export function verifyRegistrationResponse({ credential, expectedChallenge, expectedOrigin, expectedRpId, userVerification }) {
  if (!credential || credential.type !== "public-key") {
    throw new Error("invalid-credential");
  }

  const { clientDataJSON, clientData } = parseClientData(credential.response?.clientDataJSON);
  verifyClientData({
    clientData,
    expectedChallenge,
    expectedOrigin,
    expectedType: "webauthn.create"
  });

  const attestationObject = decodeCbor(base64UrlToBuffer(credential.response?.attestationObject));
  const authData = attestationObject instanceof Map ? attestationObject.get("authData") : attestationObject?.authData;
  if (!Buffer.isBuffer(authData)) {
    throw new Error("missing-auth-data");
  }

  const parsedAuthData = parseAuthenticatorData(authData, expectedRpId);
  verifyFlags(parsedAuthData.flags, userVerification);
  if (!parsedAuthData.credentialId || !parsedAuthData.credentialPublicKeySpki) {
    throw new Error("missing-attested-credential-data");
  }
  assertCredentialIdMatches(credential.rawId || credential.id, parsedAuthData.credentialId);

  return {
    credentialId: base64UrlEncode(parsedAuthData.credentialId),
    publicKeySpki: base64UrlEncode(parsedAuthData.credentialPublicKeySpki),
    signCount: parsedAuthData.signCount,
    transports: Array.isArray(credential.response?.transports)
      ? credential.response.transports.map((item) => clampText(String(item || ""), 24))
      : []
  };
}

export function verifyAuthenticationResponse({
  credential,
  storedCredential,
  expectedChallenge,
  expectedOrigin,
  expectedRpId,
  userVerification
}) {
  if (!credential || credential.type !== "public-key" || !storedCredential) {
    throw new Error("invalid-credential");
  }

  const { clientDataJSON, clientData } = parseClientData(credential.response?.clientDataJSON);
  verifyClientData({
    clientData,
    expectedChallenge,
    expectedOrigin,
    expectedType: "webauthn.get"
  });

  const authenticatorData = base64UrlToBuffer(credential.response?.authenticatorData);
  const parsedAuthData = parseAuthenticatorData(authenticatorData, expectedRpId);
  verifyFlags(parsedAuthData.flags, userVerification);

  const credentialId = String(storedCredential.credentialId || "");
  if (credential.id !== credentialId && credential.rawId !== credentialId) {
    throw new Error("unknown-passkey");
  }

  const clientDataHash = crypto.createHash("sha256").update(clientDataJSON).digest();
  const signatureBase = Buffer.concat([authenticatorData, clientDataHash]);
  const verify = crypto.createVerify("SHA256");
  verify.update(signatureBase);
  verify.end();
  const signatureValid = verify.verify(
    {
      key: base64UrlToBuffer(storedCredential.publicKeySpki),
      format: "der",
      type: "spki"
    },
    base64UrlToBuffer(credential.response?.signature)
  );

  if (!signatureValid) {
    throw new Error("invalid-passkey-signature");
  }

  const previousCount = Number(storedCredential.signCount || 0);
  if (previousCount > 0 && parsedAuthData.signCount > 0 && parsedAuthData.signCount <= previousCount) {
    throw new Error("sign-count-regressed");
  }

  return {
    signCount: parsedAuthData.signCount
  };
}
