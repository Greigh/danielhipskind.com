import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import CallCenterUser from '@/models/CallCenterUser';
import bcrypt from 'bcryptjs';
import { signAuthToken } from '@/lib/auth';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await CallCenterUser.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 400 }
      );
    }

    const token = signAuthToken({ _id: user._id, role: user.role });
    return NextResponse.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
