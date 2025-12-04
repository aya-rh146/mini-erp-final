import { NextRequest } from 'next/server';

export interface SessionUser {
  id: number;
  role: string;
  name: string | null;
  email: string;
}

export async function getServerSession(req?: NextRequest): Promise<{ user: SessionUser } | null> {
  try {
    // Get token from cookies
    const cookieHeader = req?.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    const token = tokenMatch?.[1];

    if (!token) {
      return null;
    }

    // Verify token by calling backend /api/me endpoint
    const API_URL = process.env.BACKEND_URL || 'http://localhost:3002';
    const response = await fetch(`${API_URL}/api/me`, {
      headers: {
        'Cookie': `token=${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const user = await response.json();
    
    return {
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
      },
    };
  } catch (error) {
    return null;
  }
}

export const authOptions = {
  // Placeholder for NextAuth compatibility
};

