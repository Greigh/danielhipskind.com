import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import {
  signAuthToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { getClientIp, isRateLimited } from "@/lib/rate-limit";

export async function POST(req) {
  try {
    if (isRateLimited(`login:${getClientIp(req)}`)) {
      return NextResponse.json(
        { error: "Too many auth attempts, please try again later" },
        { status: 429 },
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const user = await User.findOne({
      email: String(email).trim().toLowerCase().slice(0, 254),
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 400 },
      );
    }

    const token = signAuthToken({
      _id: user._id,
      role: user.role,
      tv: user.tokenVersion || 0,
    });
    const res = NextResponse.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
