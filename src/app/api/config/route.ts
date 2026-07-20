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

    console.log('[API Config POST] Received body:', {
      csdlDuoc: csdlDuoc ? {
        username: csdlDuoc.username,
        password: csdlDuoc.password ? '***' : '',
        storeId: csdlDuoc.storeId,
        warehouseCode: csdlDuoc.warehouseCode
      } : null,
      qd228: qd228 ? {
        appName: qd228.appName,
        appKey: qd228.appKey ? '***' : ''
      } : null,
      proxyUrl
    });

    // Fetch existing configurations first to prevent password wiping
    const existing = await prisma.systemConfig.findUnique({
      where: { id: 'default' },
    });

    console.log('[API Config POST] Existing config:', existing ? {
      duocUsername: existing.duocUsername,
      hasDuocPassword: !!existing.duocPassword,
      duocStoreId: existing.duocStoreId,
      duocWarehouseCode: existing.duocWarehouseCode,
      qd228AppName: existing.qd228AppName,
      hasQd228AppKey: !!existing.qd228AppKey,
      proxyUrl: existing.proxyUrl
    } : 'null');

    const finalPassword =
      csdlDuoc?.password && csdlDuoc.password !== '••••••••'
        ? csdlDuoc.password
        : (existing?.duocPassword || '');

    const finalAppKey =
      qd228?.appKey && qd228.appKey !== '••••••••'
        ? qd228.appKey
        : (existing?.qd228AppKey || '');

    console.log('[API Config POST] Resolved credentials:', {
      finalPasswordUsedExisting: finalPassword === existing?.duocPassword,
      finalAppKeyUsedExisting: finalAppKey === existing?.qd228AppKey,
      finalPasswordLength: finalPassword.length,
      finalAppKeyLength: finalAppKey.length
    });

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

    console.log('[API Config POST] Database upserted successfully.');

    // Reset SDK cache to force instantiating with updated credentials
    resetClient();

    // 2. Validate credentials against CSDL Dược Sandbox
    try {
      console.log('[API Config POST] Initiating validation request against CSDL Dược Sandbox...');
      const client = await getClient();
      if (client && client.csdlDuoc) {
        await client.csdlDuoc.masterData.getUnits(undefined, { page: 1, pageSize: 10 });
        console.log('[API Config POST] Validation successful!');
      } else {
        console.log('[API Config POST] No client or csdlDuoc config, skipping validation');
      }
    } catch (testError: any) {
      console.error('[API Config POST] Validation error:', testError);
      throw new Error(`Đăng nhập thất bại: ${testError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Config POST] Request handler error:', error);
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
