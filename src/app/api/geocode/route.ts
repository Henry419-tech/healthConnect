import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Missing latitude or longitude' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      {
        headers: {
          'User-Agent': 'GhanaHealthNetwork/1.0',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    
    return NextResponse.json({
      city: data.address?.city || data.address?.town || data.address?.village || data.address?.suburb || 'Unknown',
      region: data.address?.state || data.address?.region || data.address?.county || 'Unknown',
      country: data.address?.country || 'Ghana',
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to geocode location' },
      { status: 500 }
    );
  }
}