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
    const units = await client.csdlDuoc.masterData.getUnits(undefined, { page: 1, pageSize: 20 });
    return NextResponse.json(units);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
