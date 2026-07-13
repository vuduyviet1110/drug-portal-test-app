import { NextResponse } from 'next/server';
import { getClient } from '@/lib/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const client = await getClient();

  if (!client || !client.qd228) {
    return NextResponse.json(
      { error: 'QĐ 228 app credentials not configured on server' },
      { status: 400 }
    );
  }

  try {
    const prescription = await client.qd228.prescriptions.get(code);
    return NextResponse.json(prescription);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        responseBody: error.responseBody || null,
      },
      { status: 500 }
    );
  }
}
