# linkSpace

**A sealed messenger: ciphertext on the wire, private keys on the device, no phone numbers.**

linkSpace is a real-time 1:1 and group chat where the server is a relay, not a reader. Identity is a 12-character hex friend code. Encryption happens in the browser with Web Crypto. The database stores envelopes, not conversations.

If you work on WhatsApp, Messenger, or any product that has to get E2EE right at scale — this repo is a compact, honest implementation of the hard parts: **device-held identity keys, sealed payloads, group fan-out, safety numbers, and a server that cannot decrypt.**

---

## Why this exists

Most chat demos store plaintext. Most “encrypted” demos encrypt on the server with a key the server also holds.

linkSpace takes the opposite default:

| Principle | How it shows up |
| --- | --- |
| Private keys never leave the device | P-256 identity keys in IndexedDB; export/import for device moves |
| Server sees ciphertext only | Messages persist as `ciphertext`, `iv`, and keying metadata |
| Identity without a phone book | Hex friend codes, not MSISDN / address-book upload |
| Humans can verify the channel | Safety number derived from both public keys |
| Groups stay sealed | One ciphertext copy per member; each member unseals their own |

That is the same *shape* of problem WhatsApp solved for billions of people. This project is a small, readable version of that shape — not a protocol clone, not a claim of production parity.

---

## What is built

- **Auth** — signup / login, httpOnly JWT cookie, bcrypt password hashes, Helmet, rate limits on auth, search, and API
- **Discovery** — search a friend by hex code and open a sealed thread
- **1:1 chat** — Socket.IO delivery, MongoDB history, client-side encrypt/decrypt
- **Groups** — owner-created groups, add members by code, per-recipient sealed copies
- **Media** — small images sealed the same way as text
- **Presence** — online / offline over authenticated sockets
- **Bios** — user bio; group bio editable by owner
- **Safety numbers** — out-of-band identity check in the thread header
- **Key backup** — export / import identity so a new browser can unseal history

**Not built (on purpose, listed so nobody is sold a demo):** Signal Double Ratchet, sender keys, multi-device linked sessions, sealed sender, calls, or WhatsApp-scale infra. Those are the next mountains, not vaporware rows in a table.

---

## Crypto (what a protocol reviewer will actually look at)

Client (`public/crypto.js`) uses the Web Crypto API only — no custom ciphers.

1. **Identity** — ECDH P-256 key pair generated on the device. Public JWK is stored on the user document. Private JWK stays in IndexedDB.
2. **Session key** — ECDH shared bits → HKDF-SHA-256 (`info = linkspace-e2ee-v1`) → AES-256-GCM.
3. **Envelope** — random 32-byte salt, 12-byte IV, base64 ciphertext. The server validates envelope *shape*, not content (`lib/cipher.js`).
4. **Groups** — encrypt once per member with that member’s public key. The server stores an array of sealed copies and never a group plaintext.
5. **Safety number** — SHA-256 over the ordered pair of public key coordinates, shown as 12 hex digits.

Honest limitations (the kind Meta interviewers respect):

- This is **not** the Signal protocol. There is no ratchet, no prekeys, no deniable handshake.
- Group send is **N envelopes**, not a sender-key / pairwise-sender-key design.
- Keys live in the browser; XSS would be catastrophic — CSP and cookie flags are there because of that, not as decoration.
- Safety numbers are a fingerprint, not QR + numeric comparison at WhatsApp depth.

---

## Architecture

```
┌─────────────┐     JWT cookie      ┌──────────────────┐     envelopes      ┌────────────┐
│  Browser    │ ──────────────────► │  Express +       │ ─────────────────► │  MongoDB   │
│  EJS + JS   │                     │  Socket.IO       │                    │  users,    │
│  Web Crypto │ ◄──── ciphertext ── │  (ciphertext     │ ◄───────────────── │  messages, │
│  IndexedDB  │                     │   relay only)    │                    │  groups    │
└─────────────┘                     └──────────────────┘                    └────────────┘
```

| Layer | Choice |
| --- | --- |
| App | EJS + vanilla JS (`public/app.js`, `public/auth.js`, `public/crypto.js`) |
| API | Express 5, cookie-parser, CORS locked to `CLIENT_URL` |
| Realtime | Socket.IO with JWT socket middleware |
| Data | MongoDB / Mongoose |
| Auth | JWT in httpOnly, `SameSite=strict`, `Secure` in production |
| Abuse | `express-rate-limit` on `/api`, auth, and friend search |

Entry point: `server.js`. Routes under `routes/`, domain logic under `controllers/`, models under `models/`.

---

## Run it

Needs Node.js and MongoDB.

```bash
git clone https://github.com/utkarshcs18/linkSpace.git
cd linkSpace
npm install
```

Create a `.env`:

```
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://your_uri
JWT_SECRET=change-me-to-a-long-random-string
CLIENT_URL=http://localhost:3000
```

```bash
npm start
```

Open `http://localhost:3000` — create two accounts (two browsers or profiles), copy a hex friend code, initialize a chat, send a message, then inspect MongoDB: you should see ciphertext, not the words you typed.

---

## If you are hiring for messaging

This repo is a good conversation starter for:

- **Threat model** — what the server is trusted with vs what the client must never leak
- **Group E2EE** — fan-out copies vs sender keys; why N ciphertexts is correct but not scalable
- **Identity** — friend codes vs phone numbers; safety numbers vs TOFU
- **Transport vs payload** — TLS is not E2EE; cookies and CSP still matter
- **Product constraints** — presence, groups, images, and key backup without breaking the seal

Built by [utkarshcs18](https://github.com/utkarshcs18). 
If you work on WhatsApp or Messenger and want to talk about sealed systems, open an issue or reach out from the GitHub profile.
