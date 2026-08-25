const bcrypt = require("bcrypt");
const User = require("../models/user.js");
const {
  generateToken,
  clearAuthCookie,
  generateUserCode,
  isValidIdentityPublicKey,
  publicUser,
  countWords,
} = require("../lib/utils.js");

async function allocateUserCode() {
  for (let i = 0; i < 12; i += 1) {
    const userCode = generateUserCode();
    const exists = await User.exists({ userCode });
    if (!exists) return userCode;
  }
  throw new Error("Could not allocate a unique user code");
}

const signup = async (req, res) => {
  const { displayName, email, password, identityPublicKey } = req.body;

  try {
    if (!displayName || !email || !password || !identityPublicKey) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (String(displayName).trim().length < 2) {
      return res.status(400).json({ message: "Display name must be at least 2 characters" });
    }

    if (password.length < 10) {
      return res.status(400).json({ message: "Password must be at least 10 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (!isValidIdentityPublicKey(identityPublicKey)) {
      return res.status(400).json({ message: "Invalid identity public key" });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    const passwordHash = await bcrypt.hash(password, 12);
    const userCode = await allocateUserCode();

    const savedUser = await User.create({
      displayName: String(displayName).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash,
      userCode,
      identityPublicKey: {
        kty: identityPublicKey.kty,
        crv: identityPublicKey.crv,
        x: identityPublicKey.x,
        y: identityPublicKey.y,
        ext: true,
        key_ops: [],
      },
    });

    generateToken(savedUser._id, res);

    const payload = publicUser(savedUser);

    res.status(201).json(payload);
  } catch (error) {
    console.log("Error in signup controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email: String(email).toLowerCase() }).select("+passwordHash");
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials" });

    generateToken(user._id, res);

    res.status(200).json(publicUser(user));
  } catch (error) {
    console.error("Error in login controller:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const logout = (_, res) => {
  clearAuthCookie(res);
  res.status(200).json({ message: "Logged out successfully" });
};

const updateProfile = async (req, res) => {
  try {
    const { displayName, bio, avatar } = req.body;
    const updates = {};

    if (typeof displayName === "string" && displayName.trim().length >= 2) {
      updates.displayName = displayName.trim();
    }
    if (typeof bio === "string") {
      const nextBio = bio.trim().slice(0, 3000);
      if (countWords(nextBio) > 150) {
        return res.status(400).json({ message: "Bio must be at most 150 words" });
      }
      updates.bio = nextBio;
    }
    if (typeof avatar === "string" && avatar.startsWith("data:image/")) {
      if (avatar.length > 400000) {
        return res.status(400).json({ message: "Avatar is too large" });
      }
      updates.avatar = avatar;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid profile fields provided" });
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.status(200).json(publicUser(updatedUser));
  } catch (error) {
    console.log("Error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const checkAuth = (req, res) => {
  res.status(200).json(publicUser(req.user));
};

module.exports = { signup, login, logout, updateProfile, checkAuth };
