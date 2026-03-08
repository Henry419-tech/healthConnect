import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ── GET — Fetch all emergency contacts ordered by priority ────────────────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const contacts = await prisma.emergencyContact.findMany({
      where:   { userId: user.id },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, contacts });

  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch emergency contacts.' }, { status: 500 });
  }
}

// ── POST — Add a new emergency contact ───────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, relationship, number, priority, email, notes } = body;

    if (!name || !relationship || !number) {
      return NextResponse.json(
        { error: 'Name, relationship, and phone number are required.' },
        { status: 400 },
      );
    }

    // Validate Ghana phone number format
    const phoneRegex = /^(\+233|0)[0-9]{9}$/;
    if (!phoneRegex.test(number.replace(/\s/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid Ghana phone number format. Use +233XXXXXXXXX or 0XXXXXXXXX.' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // FIX: Auto-assign priority as next in sequence instead of always defaulting to 1.
    // This prevents every new contact from overwriting the "primary" position.
    let assignedPriority = priority;
    if (!assignedPriority) {
      const count = await prisma.emergencyContact.count({ where: { userId: user.id } });
      assignedPriority = count + 1;
    }

    const contact = await prisma.emergencyContact.create({
      data: {
        userId:       user.id,
        name:         name.trim(),
        relationship: relationship.trim(),
        number:       number.trim(),
        priority:     assignedPriority,
        email:        email?.trim()  || null,
        notes:        notes?.trim()  || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Emergency contact added successfully.',
      contact,
    });

  } catch (error) {
    console.error('Error adding emergency contact:', error);
    return NextResponse.json({ error: 'Failed to add emergency contact.' }, { status: 500 });
  }
}

// ── PUT — Update an existing emergency contact ───────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, relationship, number, priority, email, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required.' }, { status: 400 });
    }
    if (!name || !relationship || !number) {
      return NextResponse.json(
        { error: 'Name, relationship, and phone number are required.' },
        { status: 400 },
      );
    }

    const phoneRegex = /^(\+233|0)[0-9]{9}$/;
    if (!phoneRegex.test(number.replace(/\s/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid Ghana phone number format. Use +233XXXXXXXXX or 0XXXXXXXXX.' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const existingContact = await prisma.emergencyContact.findFirst({
      where: { id, userId: user.id },
    });
    if (!existingContact) {
      return NextResponse.json(
        { error: 'Emergency contact not found or does not belong to you.' },
        { status: 404 },
      );
    }

    const updatedContact = await prisma.emergencyContact.update({
      where: { id },
      data: {
        name:         name.trim(),
        relationship: relationship.trim(),
        number:       number.trim(),
        priority:     priority ?? existingContact.priority,
        email:        email?.trim()  || null,
        notes:        notes?.trim()  || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Emergency contact updated successfully.',
      contact: updatedContact,
    });

  } catch (error) {
    console.error('Error updating emergency contact:', error);
    return NextResponse.json({ error: 'Failed to update emergency contact.' }, { status: 500 });
  }
}

// ── DELETE — Remove an emergency contact ─────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // FIX: Read id from JSON body (not URL searchParams).
    // The emergency page sends: DELETE with body JSON.stringify({ id })
    // The old code used searchParams.get('id') which always returned null,
    // causing every delete to fail with 400 "Contact ID is required."
    const body = await request.json().catch(() => ({}));
    const id = body?.id;

    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required.' }, { status: 400 });
    }

    const existingContact = await prisma.emergencyContact.findFirst({
      where: { id, userId: user.id },
    });
    if (!existingContact) {
      return NextResponse.json(
        { error: 'Emergency contact not found or does not belong to you.' },
        { status: 404 },
      );
    }

    await prisma.emergencyContact.delete({ where: { id } });

    // Re-sequence priorities so there are no gaps after deletion
    const remaining = await prisma.emergencyContact.findMany({
      where:   { userId: user.id },
      orderBy: { priority: 'asc' },
    });
    await Promise.all(
      remaining.map((c, idx) =>
        prisma.emergencyContact.update({
          where: { id: c.id },
          data:  { priority: idx + 1 },
        }),
      ),
    );

    return NextResponse.json({ success: true, message: 'Emergency contact deleted successfully.' });

  } catch (error) {
    console.error('Error deleting emergency contact:', error);
    return NextResponse.json({ error: 'Failed to delete emergency contact.' }, { status: 500 });
  }
}