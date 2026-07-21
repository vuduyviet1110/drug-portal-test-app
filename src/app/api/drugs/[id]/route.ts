import { NextResponse } from 'next/server';
import { getClient } from '@/lib/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = await getClient();

  if (!client || !client.csdlDuoc) {
    return NextResponse.json(
      { error: 'CSDL Dược not configured on server' },
      { status: 400 }
    );
  }

  try {
    const detail = await client.csdlDuoc.drugs.getDetail(id);
    return NextResponse.json(detail);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
