import { NextResponse } from 'next/server';
import { getClient } from '@/lib/client';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const body = await request.json();
  const { items, referenceNumber } = body;

  if (!items || !items.length) {
    return NextResponse.json({ error: 'Missing items for stock-taking' }, { status: 400 });
  }

  const client = await getClient();
  if (!client || !client.csdlDuoc) {
    return NextResponse.json(
      { error: 'Client chưa được cấu hình. Vui lòng điền thông tin tài khoản trong tab Cấu hình.' },
      { status: 400 }
    );
  }

  const ref = referenceNumber || `REF-TAKE-${Date.now()}`;

  try {
    const result = await client.csdlDuoc.inventory.stockTaking({
      items,
      transactionDate: new Date().toISOString(),
    });

    await prisma.transactionLog.upsert({
      where: { id: result.transactionId || ref },
      create: {
        id: result.transactionId || ref,
        type: 'stock-taking',
        status: result.status || 'completed',
        referenceNumber: ref,
        items: JSON.stringify(items),
        attempts: result.attempts || 1,
      },
      update: {
        status: result.status || 'completed',
        attempts: result.attempts || 1,
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    const txId = error.transactionId || ref;
    await prisma.transactionLog.upsert({
      where: { id: txId },
      create: {
        id: txId,
        type: 'stock-taking',
        status: 'failed',
        referenceNumber: ref,
        items: JSON.stringify(items),
        attempts: 1,
        errorMessage: error.message,
      },
      update: {
        status: 'failed',
        errorMessage: error.message,
      },
    });

    return NextResponse.json({
      error: error.message,
      responseBody: error.responseBody || null,
      transactionId: txId
    }, { status: 500 });
  }
}
