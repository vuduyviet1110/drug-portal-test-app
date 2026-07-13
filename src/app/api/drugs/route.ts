import { NextResponse } from 'next/server';
import { getClient } from '@/lib/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

  const client = await getClient();
  if (!client || !client.csdlDuoc) {
    return NextResponse.json(
      { error: 'Client chưa được cấu hình. Vui lòng điền thông tin tài khoản trong tab Cấu hình.' },
      { status: 400 }
    );
  }

  try {
    const result = await client.csdlDuoc.drugs.search('', { page, pageSize });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
