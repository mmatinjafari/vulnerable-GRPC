import { NextResponse } from 'next/server';
import { executeGrpcCall } from '@/lib/grpcClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { service, method, payload, metadata } = body;

    if (!service || !method) {
      return NextResponse.json({ error: "Missing service or method" }, { status: 400 });
    }

    const result = await executeGrpcCall(service, method, payload || {}, metadata || {});
    return NextResponse.json(result);

  } catch (error: any) {
    return NextResponse.json({ error: true, details: error.message }, { status: 500 });
  }
}
