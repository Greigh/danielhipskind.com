import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Note from '@/models/Note';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Access denied' }, { status: 401 });
    }

    await connectToDatabase();
    const notes = await Note.find({ userId: user._id });
    return NextResponse.json(notes);
  } catch (err) {
    console.error('Get Notes error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Access denied' }, { status: 401 });
    }

    const body = await req.json();
    await connectToDatabase();

    const note = new Note({ ...body, userId: user._id });
    await note.save();
    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    console.error('Create Note error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
