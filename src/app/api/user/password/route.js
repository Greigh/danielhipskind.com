import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { verifyAuth, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';

export async function PUT(req) {
  try {
    const verified = await verifyAuth(req);
    if (!verified) {
      return NextResponse.json({ error: 'Access denied' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const user = await User.findById(verified._id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Incorrect current password' },
        { status: 400 }
      );
    }

    user.password = await bcrypt.hash(newPassword, 10);
    // Invalidate all sessions minted before this password change
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    const res = NextResponse.json({ message: 'Password updated successfully' });
    res.cookies.set(SESSION_COOKIE, '', {
      ...sessionCookieOptions(),
      maxAge: 0,
    });
    return res;
  } catch (err) {
    console.error('Update password error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
