import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const cookieHeader = req.headers.get('cookie') || '';
    
    const response = await fetch(`${BACKEND_URL}/api/clients/${id}/income`, {
      headers: {
        'Cookie': cookieHeader,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch client income' }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching client income:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client income' },
      { status: 500 }
    );
  }
}

