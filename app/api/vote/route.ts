import { NextResponse } from 'next/server';

// Placeholder vote handler. Does nothing currently.
export async function POST() {
  // In a full implementation, this endpoint would record a vote and update
  // the user state accordingly. For now we just return a 204 No Content.
  return new NextResponse(null, { status: 204 });
}
