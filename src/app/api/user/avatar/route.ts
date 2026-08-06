// src/app/api/user/avatar/route.ts
//
// POST /api/user/avatar — signed, server-side profile photo upload.
//
// The browser never talks to Cloudinary directly and never sees
// CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET — it posts the raw file
// here as multipart/form-data, we validate type + size, then stream it
// to Cloudinary using the server-only credentials already set in
// .env.local. The resulting secure_url is saved to User.image, same
// field /api/user/profile already reads/writes.
//
// Uses a fixed public_id per user (healthnav/avatars/<userId>) with
// overwrite:true so re-uploading a new photo replaces the old asset in
// place instead of leaving orphaned images in the Cloudinary account on
// every change.
//
// Note: session.user.image is only forwarded to the client session if
// it looks like an http(s) URL (see lib/auth.ts) — Cloudinary's
// secure_url satisfies that, so the avatar will show up in the session
// (topbar, etc.) once the client calls next-auth's session update().

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No image file received.' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Please upload a JPG, PNG, WEBP, or GIF image.' },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Image is too large — please choose one under 5MB.' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'healthnav/avatars',
          public_id: session.user.id,
          overwrite: true,
          invalidate: true,
          resource_type: 'image',
          transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed.'));
          resolve(result);
        },
      );
      uploadStream.end(buffer);
    });

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: uploadResult.secure_url },
      select: { image: true },
    });

    return NextResponse.json({ image: user.image });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Could not upload photo. Please try again.' }, { status: 500 });
  }
}