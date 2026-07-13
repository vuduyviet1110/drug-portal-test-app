import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resetClient } from '@/lib/client';

export async function GET() {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      return NextResponse.json({ csdlDuoc: null, qd228: null });
    }

    return NextResponse.json({
      csdlDuoc: {
        username: config.duocUsername || '',
        storeId: config.duocStoreId || '',
        warehouseCode: config.duocWarehouseCode || '',
      },
      qd228: {
        appName: config.qd228AppName || '',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { csdlDuoc, qd228 } = body;

    await prisma.systemConfig.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        duocUsername: csdlDuoc?.username || '',
        duocPassword: csdlDuoc?.password || '',
        duocStoreId: csdlDuoc?.storeId || null,
        duocWarehouseCode: csdlDuoc?.warehouseCode || null,
        qd228AppName: qd228?.appName || null,
        qd228AppKey: qd228?.appKey || null,
      },
      update: {
        duocUsername: csdlDuoc?.username || '',
        duocPassword: csdlDuoc?.password || '',
        duocStoreId: csdlDuoc?.storeId || null,
        duocWarehouseCode: csdlDuoc?.warehouseCode || null,
        qd228AppName: qd228?.appName || null,
        qd228AppKey: qd228?.appKey || null,
      },
    });

    resetClient(); // Reset cache to instantiate new client next time

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
