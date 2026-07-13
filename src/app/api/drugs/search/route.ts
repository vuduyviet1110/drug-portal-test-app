import { NextResponse } from 'next/server';
import { getClient } from '@/lib/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';

  const client = await getClient();
  if (!client || !client.csdlDuoc) {
    return NextResponse.json(
      { error: 'Client chưa được cấu hình. Vui lòng điền thông tin tài khoản trong tab Cấu hình.' },
      { status: 400 }
    );
  }

  try {
    const result = await client.csdlDuoc.drugs.search(keyword);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
