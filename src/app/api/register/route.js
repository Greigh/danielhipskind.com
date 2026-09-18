import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import CallCenterUser from '@/models/CallCenterUser';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new CallCenterUser({
      username: String(username).trim().slice(0, 64),
      email: String(email).trim().toLowerCase().slice(0, 254),
      password: hashedPassword,
      role: 'agent', // never accept client-supplied role
    });

    try {
      await user.save();
      return NextResponse.json({ message: 'User registered' }, { status: 201 });
    } catch (err) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
