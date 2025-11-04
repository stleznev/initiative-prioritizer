import { NextResponse } from 'next/server';

// Temporary stub for next-pair API.
// In a full implementation this would read the active dataset and user state
// from the database and return the next pair of initiatives and progress info.
export async function GET() {
  // Return null pair to indicate no comparisons available
  return NextResponse.json(null);
}
