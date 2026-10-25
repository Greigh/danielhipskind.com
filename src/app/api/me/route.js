import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import { verifyAuth, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

// Current session probe — the Adamas client calls this on startup.
export async function GET(req) {
  try {
    const verified = await verifyAuth(req);
    if (!verified) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(verified._id);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Token minted before a password change is stale
    if ((verified.tv || 0) !== (user.tokenVersion || 0)) {
      const res = NextResponse.json(
        { error: "Session expired" },
        { status: 401 },
      );
      res.cookies.set(SESSION_COOKIE, "", {
        ...sessionCookieOptions(),
        maxAge: 0,
      });
      return res;
    }

    return NextResponse.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Me error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
