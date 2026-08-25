document.addEventListener("DOMContentLoaded", async () => {
  const meCode = document.getElementById("me-code");
  const meName = document.getElementById("me-name");
  const listEl = document.getElementById("contact-list");
  const searchForm = document.getElementById("search-form");
  const searchError = document.getElementById("search-error");
  const groupForm = document.getElementById("group-form");
  const groupError = document.getElementById("group-error");
  const addMemberForm = document.getElementById("add-member-form");
  const groupBioForm = document.getElementById("group-bio-form");
  const groupBioInput = document.getElementById("group-bio-input");
  const emptyThread = document.getElementById("empty-thread");
  const activeThread = document.getElementById("active-thread");
  const messagesEl = document.getElementById("messages");
  const composer = document.getElementById("composer");
  const msgInput = document.getElementById("msg-input");
  const verifyCode = document.getElementById("verify-code");
  const peerName = document.getElementById("peer-name");
  const peerStatus = document.getElementById("peer-status");
  const peerBio = document.getElementById("peer-bio");
  const threadAvatar = document.getElementById("thread-avatar");
  const bioForm = document.getElementById("bio-form");
  const bioInput = document.getElementById("bio-input");
  const bioCount = document.getElementById("bio-count");
  const bioError = document.getElementById("bio-error");

  let me = null;
  let identity = null;
  let partners = [];
  let groups = [];
  let onlineIds = new Set();
  let activeChat = null;
  const renderedIds = new Set();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  async function api(path, options = {}) {
    const res = await fetch(path, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      window.location.href = "/";
      throw new Error("Unauthorized");
    }
    if (!res.ok) throw new Error(data.message || data.error || "Request failed");
    return data;
  }

  try {
    me = await api("/api/auth/check");
    identity = await LSCrypto.getIdentity(me.email);
    if (!identity) {
      throw new Error("Identity key missing on this device");
    }
  } catch (err) {
    window.location.href = "/";
    return;
  }

  meCode.textContent = me.userCodeFormatted;
  meName.textContent = `${me.displayName}  ·  ${me.email}`;
  bioInput.value = me.bio || "";

  function countWords(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  function refreshBioCount() {
    const n = countWords(bioInput.value);
    bioCount.textContent = `${n} / 150 words`;
    bioCount.classList.toggle("form-error", n > 150);
  }
  refreshBioCount();
  bioInput.addEventListener("input", refreshBioCount);

  function memberById(group, userId) {
    return (group.members || []).find((member) => String(member._id) === String(userId));
  }

  async function groupSafetyNumber(group) {
    const pubs = (group.members || [])
      .map((member) => member.identityPublicKey)
      .filter((key) => key && key.x && key.y)
      .map((key) => `${key.x}:${key.y}`)
      .sort();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pubs.join("|")));
    const hex = [...new Uint8Array(digest)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 12)
      .toUpperCase();
    return hex.replace(/(.{4})/g, "$1 ").trim();
  }

  function isActiveGroup(groupId) {
    return activeChat?.type === "group" && String(activeChat.group._id) === String(groupId);
  }

  function isActivePeer(userId) {
    return activeChat?.type === "dm" && String(activeChat.peer._id) === String(userId);
  }

  const socket = io({ withCredentials: true });
  socket.on("getOnlineUsers", (ids) => {
    onlineIds = new Set(ids);
    renderList();
    refreshHeader();
  });
  socket.on("newMessage", async (msg) => {
    if (!isActivePeer(msg.senderId) && !isActivePeer(msg.receiverId)) return;
    await appendMessage(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
  socket.on("newGroupMessage", async (msg) => {
    if (!isActiveGroup(msg.groupId)) return;
    await appendMessage(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });

  function setThreadAvatar(label) {
    const letter = String(label || "?").trim().charAt(0).toUpperCase() || "?";
    threadAvatar.textContent = letter;
  }

  function refreshHeader() {
    if (!activeChat) return;
    if (activeChat.type === "dm") {
      const peer = activeChat.peer;
      peerName.textContent = peer.displayName;
      setThreadAvatar(peer.displayName);
      peerStatus.textContent = onlineIds.has(String(peer._id)) ? "ONLINE" : "OFFLINE";
      peerStatus.classList.toggle("is-online", onlineIds.has(String(peer._id)));
      peerBio.textContent = peer.bio || "";
      peerBio.hidden = !peer.bio;
      addMemberForm.classList.add("hidden");
      groupBioForm.classList.add("hidden");
      return;
    }
    const group = activeChat.group;
    const onlineCount = group.members.filter((member) => onlineIds.has(String(member._id))).length;
    peerName.textContent = group.name;
    setThreadAvatar(group.name);
    peerStatus.textContent = `GROUP · ${group.members.length} · ${onlineCount} live`;
    peerStatus.classList.toggle("is-online", onlineCount > 0);
    peerBio.textContent = group.bio || "";
    peerBio.hidden = !group.bio;
    addMemberForm.classList.remove("hidden");
    const isOwner = String(group.createdBy) === String(me._id);
    groupBioForm.classList.toggle("hidden", !isOwner);
    if (isOwner) groupBioInput.value = group.bio || "";
  }

  function renderList() {
    listEl.innerHTML = "";
    groups.forEach((group) => {
      const li = document.createElement("li");
      li.className = "contact-row";
      if (isActiveGroup(group._id)) li.classList.add("active-contact");
      const left = document.createElement("span");
      left.textContent = group.name;
      const right = document.createElement("span");
      right.textContent = `[GROUP ${group.members.length}]`;
      li.append(left, right);
      li.addEventListener("click", () => openGroup(group));
      listEl.appendChild(li);
    });
    partners.forEach((p) => {
      const li = document.createElement("li");
      li.className = "contact-row";
      if (isActivePeer(p._id)) li.classList.add("active-contact");
      const left = document.createElement("span");
      left.textContent = p.savedName || p.displayName;
      const right = document.createElement("span");
      right.textContent = onlineIds.has(String(p._id)) ? "[ONLINE]" : "[OFFLINE]";
      li.append(left, right);
      li.addEventListener("click", () => openChat(p));
      listEl.appendChild(li);
    });
    syncFriendsDropdown();
  }

  function syncFriendsDropdown() {
    const drop = document.getElementById("friends-drop");
    if (!drop) return;
    const count = groups.length + partners.length;
    const summary = drop.querySelector("summary");
    if (summary) summary.textContent = `Friends (${count})`;
    if (count > 5) {
      drop.classList.remove("nav-drop-locked");
    } else {
      drop.open = true;
      drop.classList.add("nav-drop-locked");
    }
  }

  async function loadSidebar() {
    const [chatPartners, groupList] = await Promise.all([
      api("/api/messages/chats"),
      api("/api/groups"),
    ]);
    partners = chatPartners;
    groups = groupList;
    renderList();
  }

  function senderPublicKey(msg) {
    if (activeChat?.type === "dm") return activeChat.peer.identityPublicKey;
    const sender = memberById(activeChat.group, msg.senderId);
    if (String(msg.senderId) === String(me._id)) return identity.publicJwk;
    return sender?.identityPublicKey;
  }

  async function decryptMessage(msg) {
    try {
      const theirPub = senderPublicKey(msg);
      const text = await LSCrypto.decryptWith(identity.privateJwk, theirPub, msg);
      return { ok: true, text, kind: msg.kind || "text" };
    } catch {
      return { ok: false, text: "[unable to unseal on this device]", kind: "text" };
    }
  }

  function buildMessageEl(msg, decoded) {
    const wrap = document.createElement("article");
    wrap.className = "msg-container chat-bubble";
    if (String(msg.senderId) === String(me._id)) wrap.classList.add("mine");

    if (activeChat?.type === "group") {
      const sender = memberById(activeChat.group, msg.senderId);
      const label = document.createElement("p");
      label.className = "tiny";
      label.textContent = sender?.displayName || "UNKNOWN";
      wrap.appendChild(label);
    }

    if (decoded.ok && decoded.kind === "image") {
      const img = document.createElement("img");
      img.src = decoded.text;
      img.alt = "image";
      wrap.appendChild(img);
    } else {
      const p = document.createElement("p");
      p.textContent = decoded.text;
      wrap.appendChild(p);
    }
    return wrap;
  }

  async function appendMessage(msg) {
    const id = String(msg._id || "");
    if (id && renderedIds.has(id)) return;
    if (id) renderedIds.add(id);
    const decoded = await decryptMessage(msg);
    messagesEl.appendChild(buildMessageEl(msg, decoded));
  }

  async function renderHistory(history) {
    renderedIds.clear();
    messagesEl.replaceChildren();
    const decodedList = await Promise.all(history.map((msg) => decryptMessage(msg)));
    const fragment = document.createDocumentFragment();
    history.forEach((msg, index) => {
      const id = String(msg._id || "");
      if (id) renderedIds.add(id);
      fragment.appendChild(buildMessageEl(msg, decodedList[index]));
    });
    messagesEl.appendChild(fragment);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function openChat(peer) {
    activeChat = { type: "dm", peer };
    emptyThread.classList.add("hidden");
    activeThread.classList.remove("hidden");
    refreshHeader();
    const number = await LSCrypto.safetyNumber(identity.publicJwk, peer.identityPublicKey);
    verifyCode.textContent = number;
    verifyCode.dataset.real = number;
    verifyCode.classList.remove("verified");
    document.getElementById("btn-verify").textContent = "Verify";
    renderList();
    const history = await api(`/api/messages/${peer._id}`);
    await renderHistory(history);
  }

  async function openGroup(group) {
    activeChat = { type: "group", group };
    emptyThread.classList.add("hidden");
    activeThread.classList.remove("hidden");
    refreshHeader();
    const number = await groupSafetyNumber(group);
    verifyCode.textContent = number;
    verifyCode.dataset.real = number;
    verifyCode.classList.remove("verified");
    document.getElementById("btn-verify").textContent = "Verify";
    renderList();
    const history = await api(`/api/groups/${group._id}/messages`);
    await renderHistory(history);
  }

  async function sealPlaintext(plaintext, kind) {
    if (activeChat.type === "dm") {
      const payload = await LSCrypto.encryptFor(
        identity.privateJwk,
        activeChat.peer.identityPublicKey,
        plaintext
      );
      payload.kind = kind;
      return api(`/api/messages/send/${activeChat.peer._id}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    const copies = [];
    for (const member of activeChat.group.members) {
      const sealed = await LSCrypto.encryptFor(
        identity.privateJwk,
        member.identityPublicKey,
        plaintext
      );
      copies.push({
        recipientId: member._id,
        ciphertext: sealed.ciphertext,
        iv: sealed.iv,
        ephemeralPublicKey: sealed.ephemeralPublicKey,
      });
    }
    return api(`/api/groups/${activeChat.group._id}/messages`, {
      method: "POST",
      body: JSON.stringify({ kind, copies }),
    });
  }

  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    searchError.hidden = true;
    const code = document.getElementById("search-code").value;
    try {
      const found = await api(`/api/users/search?code=${encodeURIComponent(code)}`);
      const added = await api("/api/users/contacts", {
        method: "POST",
        body: JSON.stringify({ userId: found._id, savedName: found.displayName }),
      });
      await loadSidebar();
      const peer = partners.find((p) => p._id === added._id) || added;
      await openChat(peer);
      document.getElementById("search-code").value = "";
    } catch (err) {
      searchError.hidden = false;
      searchError.textContent = err.message;
    }
  });

  groupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    groupError.hidden = true;
    const name = document.getElementById("group-name").value.trim();
    const memberCodes = document
      .getElementById("group-codes")
      .value.split(/[\s,;]+/)
      .filter(Boolean);
    try {
      const group = await api("/api/groups", {
        method: "POST",
        body: JSON.stringify({ name, memberCodes }),
      });
      await loadSidebar();
      const opened = groups.find((item) => item._id === group._id) || group;
      await openGroup(opened);
      document.getElementById("group-name").value = "";
      document.getElementById("group-codes").value = "";
    } catch (err) {
      groupError.hidden = false;
      groupError.textContent = err.message;
    }
  });

  addMemberForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (activeChat?.type !== "group") return;
    const code = document.getElementById("add-member-code").value;
    try {
      const group = await api(`/api/groups/${activeChat.group._id}/members`, {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      document.getElementById("add-member-code").value = "";
      await loadSidebar();
      await openGroup(groups.find((item) => item._id === group._id) || group);
    } catch (err) {
      alert(err.message);
    }
  });

  groupBioForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (activeChat?.type !== "group") return;
    const bio = groupBioInput.value.trim();
    if (countWords(bio) > 150) {
      alert("Group bio must be at most 150 words");
      return;
    }
    try {
      const group = await api(`/api/groups/${activeChat.group._id}`, {
        method: "PATCH",
        body: JSON.stringify({ bio }),
      });
      await loadSidebar();
      activeChat.group = groups.find((item) => item._id === group._id) || group;
      refreshHeader();
    } catch (err) {
      alert(err.message);
    }
  });

  composer.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeChat) return;
    const text = msgInput.value.trim();
    if (!text) return;
    msgInput.value = "";
    try {
      const saved = await sealPlaintext(text, "text");
      await appendMessage(saved);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } catch (err) {
      msgInput.value = text;
      alert(err.message);
    }
  });

  document.getElementById("btn-image").addEventListener("click", () => {
    document.getElementById("img-input").click();
  });

  document.getElementById("img-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file || !activeChat) return;
    if (file.size > 180000) {
      alert("Image must be under 180KB so it can be sealed in-channel.");
      return;
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const saved = await sealPlaintext(dataUrl, "image");
    await appendMessage(saved);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });

  document.getElementById("btn-verify").addEventListener("click", () => {
    const originalCode = verifyCode.dataset.real || verifyCode.innerText;
    const btn = document.getElementById("btn-verify");
    verifyCode.classList.remove("verified");
    btn.textContent = "Verify";
    let iterations = 0;
    const maxIterations = 20;
    const interval = setInterval(() => {
      verifyCode.innerText = originalCode
        .split("")
        .map((char) => (char === " " ? " " : chars[Math.floor(Math.random() * chars.length)]))
        .join("");
      iterations += 1;
      if (iterations >= maxIterations) {
        clearInterval(interval);
        verifyCode.innerText = originalCode;
        requestAnimationFrame(() => verifyCode.classList.add("verified"));
        btn.textContent = "Verified";
      }
    }, 20);
  });

  document.getElementById("btn-copy-code").addEventListener("click", async () => {
    await navigator.clipboard.writeText(me.userCodeFormatted);
    document.getElementById("btn-copy-code").textContent = "Copied";
    setTimeout(() => {
      document.getElementById("btn-copy-code").textContent = "Copy code";
    }, 1200);
  });

  bioForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    bioError.hidden = true;
    const bio = bioInput.value.trim();
    if (countWords(bio) > 150) {
      bioError.hidden = false;
      bioError.textContent = "Bio must be at most 150 words";
      return;
    }
    try {
      me = await api("/api/auth/update-profile", {
        method: "PUT",
        body: JSON.stringify({ bio }),
      });
      bioInput.value = me.bio || "";
      refreshBioCount();
    } catch (err) {
      bioError.hidden = false;
      bioError.textContent = err.message;
    }
  });

  document.getElementById("btn-export").addEventListener("click", async () => {
    const json = await LSCrypto.exportBackup(me.email);
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `linkspace-keys-${me.userCode}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById("btn-logout").addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    window.location.href = "/";
  });

  await loadSidebar();
});
