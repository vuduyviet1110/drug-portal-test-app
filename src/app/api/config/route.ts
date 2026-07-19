import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resetClient, getClient } from '@/lib/client';

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
        password: config.duocPassword ? '••••••••' : '',
        storeId: config.duocStoreId || '',
        warehouseCode: config.duocWarehouseCode || '',
      },
      qd228: {
        appName: config.qd228AppName || '',
        appKey: config.qd228AppKey ? '••••••••' : '',
      },
      proxyUrl: config.proxyUrl || '',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { csdlDuoc, qd228, proxyUrl } = body;

    // Fetch existing configurations first to prevent password wiping
    const existing = await prisma.systemConfig.findUnique({
      where: { id: 'default' },
    });

    const finalPassword =
      csdlDuoc?.password && csdlDuoc.password !== '••••••••'
        ? csdlDuoc.password
        : (existing?.duocPassword || '');

    const finalAppKey =
      qd228?.appKey && qd228.appKey !== '••••••••'
        ? qd228.appKey
        : (existing?.qd228AppKey || '');

    // 1. Upsert configuration credentials
    await prisma.systemConfig.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        duocUsername: csdlDuoc?.username || '',
        duocPassword: finalPassword,
        duocStoreId: csdlDuoc?.storeId || null,
        duocWarehouseCode: csdlDuoc?.warehouseCode || null,
        qd228AppName: qd228?.appName || null,
        qd228AppKey: finalAppKey,
        proxyUrl: proxyUrl || null,
      },
      update: {
        duocUsername: csdlDuoc?.username || '',
        duocPassword: finalPassword,
        duocStoreId: csdlDuoc?.storeId || null,
        duocWarehouseCode: csdlDuoc?.warehouseCode || null,
        qd228AppName: qd228?.appName || null,
        qd228AppKey: finalAppKey,
        proxyUrl: proxyUrl || null,
      },
    });

    // Reset SDK cache to force instantiating with updated credentials
    resetClient();

    // 2. Validate credentials against CSDL Dược Sandbox
    try {
      const client = await getClient();
      if (client && client.csdlDuoc) {
        await client.csdlDuoc.masterData.getUnits(undefined, { page: 1, pageSize: 10 });
      }
    } catch (testError: any) {
      throw new Error(`Đăng nhập thất bại: ${testError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    await prisma.systemConfig.deleteMany();
    resetClient();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
