import { NextResponse } from 'next/server';
import { getClient } from '@/lib/client';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const body = await request.json();
  const { items, reason, referenceNumber } = body;

  if (!items || !items.length) {
    return NextResponse.json({ error: 'Missing items for stock-out' }, { status: 400 });
  }

  const client = await getClient();
  if (!client || !client.csdlDuoc) {
    return NextResponse.json(
      { error: 'Client chưa được cấu hình. Vui lòng điền thông tin tài khoản trong tab Cấu hình.' },
      { status: 400 }
    );
  }

  const ref = referenceNumber || `REF-OUT-${Date.now()}`;
  const txReason = reason || 'sale-retail';

  try {
    const result = await client.csdlDuoc.inventory.stockOut({
      items,
      reason: txReason,
      referenceNumber: ref,
      transactionDate: new Date().toISOString(),
    });

    const isSuccess = result.status === 'completed';
    const rawData = (result.raw || {}) as Record<string, unknown>;
    const messages = rawData.messages || rawData.message || rawData.errors || [];
    const errorMsg = isSuccess ? null : (Array.isArray(messages) ? messages.join(', ') : String(messages));

    await prisma.transactionLog.upsert({
      where: { id: result.transactionId || ref },
      create: {
        id: result.transactionId || ref,
        type: 'stock-out',
        status: result.status || 'completed',
        reason: txReason,
        referenceNumber: ref,
        items: JSON.stringify(items),
        attempts: result.attempts || 1,
        errorMessage: errorMsg,
      },
      update: {
        status: result.status || 'completed',
        attempts: result.attempts || 1,
        errorMessage: errorMsg,
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    const txId = error.transactionId || ref;
    await prisma.transactionLog.upsert({
      where: { id: txId },
      create: {
        id: txId,
        type: 'stock-out',
        status: 'failed',
        reason: txReason,
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
