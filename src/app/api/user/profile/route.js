import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PUT(req) {
  try {
    const verified = await verifyAuth(req);
    if (!verified) {
      return NextResponse.json({ error: 'Access denied' }, { status: 401 });
    }

    const { username, email } = await req.json();
    const cleanUsername =
      username === undefined
        ? undefined
        : String(username).trim().slice(0, 64);
    const cleanEmail =
      email === undefined
        ? undefined
        : String(email).trim().toLowerCase().slice(0, 254);

    if (cleanUsername !== undefined && cleanUsername.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }
    if (cleanEmail !== undefined && !EMAIL_RE.test(cleanEmail)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findById(verified._id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (cleanEmail && cleanEmail !== user.email) {
      const existing = await User.findOne({ email: cleanEmail });
      if (existing) {
        return NextResponse.json(
          { error: 'Email already currently in use' },
          { status: 400 }
        );
      }
      user.email = cleanEmail;
    }

    if (cleanUsername) user.username = cleanUsername;

    await user.save();

    return NextResponse.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
