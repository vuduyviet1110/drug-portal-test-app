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
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (step: string, message: string) => {
        controller.enqueue(
          encoder.encode(JSON.stringify({ step, message }) + '\n')
        );
      };

      try {
        const body = await request.json();
        const { csdlDuoc, qd228, proxyUrl } = body;

        sendProgress('parse_body', 'Đang nhận dữ liệu cấu hình hệ thống...');

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

        sendProgress('save_db', 'Đang lưu trữ thông tin cấu hình vào cơ sở dữ liệu...');
        
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

        sendProgress('db_saved', 'Đã lưu cấu hình thành công. Đang tải lại SDK client...');

        // Reset SDK cache to force instantiating with updated credentials
        resetClient();

        // 2. Validate credentials against CSDL Dược Sandbox
        sendProgress('initiating_validation', 'Đang khởi tạo kết nối và bắt đầu kiểm tra xác thực...');
        
        const client = await getClient(sendProgress);
        
        if (client && client.csdlDuoc) {
          sendProgress('verifying_auth', 'Đang đăng nhập và truy xuất thử danh mục từ CSDL Dược...');
          await client.csdlDuoc.masterData.getUnits(undefined, { page: 1, pageSize: 10 });
          sendProgress('validation_success', 'Đăng nhập và xác thực kết nối CSDL Dược thành công!');
        } else {
          sendProgress('skipping_validation', 'Không có cấu hình CSDL Dược, bỏ qua xác thực.');
        }

        sendProgress('success', 'Tất cả cấu hình đã được áp dụng và hoạt động ổn định!');
        controller.close();
      } catch (error: any) {
        console.error('[API Config POST] Request handler error:', error);
        controller.enqueue(
          encoder.encode(JSON.stringify({ error: error.message || 'Lỗi không xác định' }) + '\n')
        );
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
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
