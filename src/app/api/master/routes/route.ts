import { NextResponse } from 'next/server';
import { getClient } from '@/lib/client';

export async function GET() {
  const client = await getClient();
  if (!client || !client.csdlDuoc) {
    return NextResponse.json(
      { error: 'Client chưa được cấu hình. Vui lòng điền thông tin tài khoản trong tab Cấu hình.' },
      { status: 400 }
    );
  }

  try {
    const routes = await client.csdlDuoc.masterData.getRoutes(undefined, { page: 1, pageSize: 20 });
    return NextResponse.json(routes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
