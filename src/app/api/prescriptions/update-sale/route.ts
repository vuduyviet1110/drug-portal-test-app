import { NextResponse } from 'next/server';
import { getClient } from '@/lib/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prescriptionCode, items } = body;

    if (!prescriptionCode || !items || !items.length) {
      return NextResponse.json(
        { error: 'Missing parameters for prescription sale update' },
        { status: 400 }
      );
    }

    const client = await getClient();
    if (!client || !client.qd228) {
      return NextResponse.json(
        { error: 'QĐ 228 app credentials not configured on server' },
        { status: 400 }
      );
    }

    const result = await client.qd228.prescriptions.updateSaleQty({
      maDonThuoc: prescriptionCode,
      items: items.map((item: any) => ({
        drugId: item.drugCode,
        soldQuantity: Number(item.quantity || 0),
      })),
    });

    return NextResponse.json(result);
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
