document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("auth-form");
  const errorEl = document.getElementById("auth-error");
  const hintEl = document.getElementById("auth-hint");
  const tabLogin = document.getElementById("tab-login");
  const tabSignup = document.getElementById("tab-signup");
  let mode = "login";

  const typeContainer = document.getElementById("typewriter-text");
  const typeCursor = document.getElementById("typewriter-cursor");
  const typeText =
    "INITIALIZING SECURE PROTOCOL...\nGENERATING DEVICE IDENTITY KEY...\nPRIVATE KEY STAYS ON DEVICE.";

  function triggerTypewriter() {
    if (!typeContainer) return;
    typeContainer.innerText = "";
    typeCursor.classList.remove("blink");
    let i = 0;
    function typeChar() {
      if (i < typeText.length) {
        typeContainer.innerText += typeText.charAt(i);
        i += 1;
        setTimeout(typeChar, 28 + Math.random() * 40);
      } else {
        typeCursor.classList.add("blink");
      }
    }
    typeChar();
  }
  triggerTypewriter();

  const scanCard = document.getElementById("scan-card");
  if (scanCard) {
    const runScan = () => {
      scanCard.classList.remove("scanning");
      void scanCard.offsetWidth;
      scanCard.classList.add("scanning");
    };
    runScan();
    setInterval(runScan, 4200);
  }

  function setMode(next) {
    mode = next;
    tabLogin.classList.toggle("active", mode === "login");
    tabSignup.classList.toggle("active", mode === "signup");
    document.querySelectorAll(".signup-only").forEach((el) => {
      el.classList.toggle("hidden", mode !== "signup");
    });
    hintEl.textContent =
      mode === "signup"
        ? "Signup creates a P-256 identity key on this device and a unique hex friend code on the server."
        : "Login loads the identity key stored in this browser. A new device needs a key backup import.";
  }

  tabLogin.addEventListener("click", () => setMode("login"));
  tabSignup.addEventListener("click", () => setMode("signup"));

  function showError(msg) {
    errorEl.hidden = false;
    errorEl.textContent = msg;
  }

  async function api(path, body) {
    const res = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "");
    const displayName = String(fd.get("displayName") || "").trim();

    try {
      if (mode === "signup") {
        const identity = await LSCrypto.ensureIdentity(email);
        await api("/api/auth/signup", {
          displayName,
          email,
          password,
          identityPublicKey: identity.publicJwk,
        });
      } else {
        const existing = await LSCrypto.getIdentity(email);
        if (!existing) {
          throw new Error("No identity key on this device. Import a backup, or create a new account.");
        }
        await api("/api/auth/login", { email, password });
      }
      window.location.href = "/app";
    } catch (err) {
      showError(err.message);
    }
  });

  document.getElementById("btn-import").addEventListener("click", () => {
    document.getElementById("key-file").click();
  });

  document.getElementById("key-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const email = await LSCrypto.importBackup(text);
      form.email.value = email;
      showError("");
      errorEl.hidden = true;
      hintEl.textContent = "Key backup imported. Enter password to seal in.";
    } catch (err) {
      showError(err.message);
    }
  });

  fetch("/api/auth/check", { credentials: "include" })
    .then((r) => {
      if (r.ok) window.location.href = "/app";
    })
    .catch(() => {});
});
