import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find client by userId - need to get clientId from backend
    // First, get all clients and find the one matching userId
    const cookieHeader = req.headers.get('cookie') || '';
    const clientsResponse = await fetch(`${BACKEND_URL}/api/clients`, {
      headers: {
        'Cookie': cookieHeader,
      },
    });

    if (!clientsResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: clientsResponse.status }
      );
    }

    const clients = await clientsResponse.json();
    const client = clients.find((c: any) => c.userId === session.user.id);

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: client.id.toString(),
      userId: client.userId.toString(),
      company: client.company,
      address: client.address,
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

