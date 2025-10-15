import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
// GET - Fetch all emergency contacts for the logged-in user
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    // Fetch all emergency contacts for this user, ordered by priority
    const contacts = await prisma.emergencyContact.findMany({
      where: { userId: user.id },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({
      success: true,
      contacts
    });

  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emergency contacts.' },
      { status: 500 }
    );
  }
}

// POST - Add a new emergency contact
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, relationship, number, priority, email, notes } = body;

    // Validation
    if (!name || !relationship || !number) {
      return NextResponse.json(
        { error: 'Name, relationship, and phone number are required.' },
        { status: 400 }
      );
    }

    // Validate Ghana phone number format
    const phoneRegex = /^(\+233|0)[0-9]{9}$/;
    if (!phoneRegex.test(number.replace(/\s/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid Ghana phone number format.' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    // Create the emergency contact
    const contact = await prisma.emergencyContact.create({
      data: {
        userId: user.id,
        name: name.trim(),
        relationship: relationship.trim(),
        number: number.trim(),
        priority: priority || 1,
        email: email?.trim() || null,
        notes: notes?.trim() || null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Emergency contact added successfully.',
      contact
    });

  } catch (error) {
    console.error('Error adding emergency contact:', error);
    return NextResponse.json(
      { error: 'Failed to add emergency contact.' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing emergency contact
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, name, relationship, number, priority, email, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Contact ID is required.' },
        { status: 400 }
      );
    }

    // Validation
    if (!name || !relationship || !number) {
      return NextResponse.json(
        { error: 'Name, relationship, and phone number are required.' },
        { status: 400 }
      );
    }

    // Validate Ghana phone number format
    const phoneRegex = /^(\+233|0)[0-9]{9}$/;
    if (!phoneRegex.test(number.replace(/\s/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid Ghana phone number format.' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    // Verify the contact belongs to this user
    const existingContact = await prisma.emergencyContact.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    });

    if (!existingContact) {
      return NextResponse.json(
        { error: 'Emergency contact not found or does not belong to you.' },
        { status: 404 }
      );
    }

    // Update the contact
    const updatedContact = await prisma.emergencyContact.update({
      where: { id: id },
      data: {
        name: name.trim(),
        relationship: relationship.trim(),
        number: number.trim(),
        priority: priority || 1,
        email: email?.trim() || null,
        notes: notes?.trim() || null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Emergency contact updated successfully.',
      contact: updatedContact
    });

  } catch (error) {
    console.error('Error updating emergency contact:', error);
    return NextResponse.json(
      { error: 'Failed to update emergency contact.' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an emergency contact
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Contact ID is required.' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    // Verify the contact belongs to this user
    const existingContact = await prisma.emergencyContact.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    });

    if (!existingContact) {
      return NextResponse.json(
        { error: 'Emergency contact not found or does not belong to you.' },
        { status: 404 }
      );
    }

    // Delete the contact
    await prisma.emergencyContact.delete({
      where: { id: id }
    });

    return NextResponse.json({
      success: true,
      message: 'Emergency contact deleted successfully.'
    });

  } catch (error) {
    console.error('Error deleting emergency contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete emergency contact.' },
      { status: 500 }
    );
  }
}