import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors isPublicRegistrationAllowed() in Call Center Help/client/lib/security.js
function isPublicRegistrationAllowed() {
  return (
    process.env.ALLOW_PUBLIC_REGISTER === "true" ||
    (process.env.NODE_ENV !== "production" &&
      process.env.ALLOW_PUBLIC_REGISTER !== "false")
  );
}

export async function POST(req) {
  try {
    if (isRateLimited(`register:${getClientIp(req)}`)) {
      return NextResponse.json(
        { error: "Too many auth attempts, please try again later" },
        { status: 429 },
      );
    }

    if (!isPublicRegistrationAllowed()) {
      return NextResponse.json(
        { error: "Public registration is disabled" },
        { status: 403 },
      );
    }

    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const cleanUsername = String(username).trim().slice(0, 64);
    const cleanEmail = String(email).trim().toLowerCase().slice(0, 254);

    if (cleanUsername.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters" },
        { status: 400 },
      );
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      role: "agent", // never accept client-supplied role
    });

    try {
      await user.save();
      return NextResponse.json({ message: "User registered" }, { status: 201 });
    } catch (err) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 },
      );
    }
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
