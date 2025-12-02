// frontend/app/api/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return proxyRequest(request)
}

export async function POST(request: NextRequest) {
  return proxyRequest(request)
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request)
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request)
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request)
}

async function proxyRequest(request: NextRequest) {
  const url = new URL(request.url)
  const backendUrl = `http://localhost:3001${url.pathname.replace(/^\/api/, '')}${url.search}`

  return fetch(backendUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    // @ts-ignore
    duplex: 'half',
  })
}