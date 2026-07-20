import { getClient } from '@/lib/client';
import { createNdjsonStream } from '@/lib/ndjson-stream';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

  return createNdjsonStream(async (sendProgress, sendPayload) => {
    sendProgress('request_received', `Nhận yêu cầu tải danh mục thuốc (trang ${page}, ${pageSize} mục/trang)...`);
    sendProgress('init_client', 'Đang khởi tạo SDK client và kiểm tra kết nối/proxy...');

    const client = await getClient(sendProgress);
    if (!client || !client.csdlDuoc) {
      throw new Error('Client chưa được cấu hình. Vui lòng điền thông tin tài khoản trong tab Cấu hình.');
    }

    sendProgress('calling_api', 'Đang gọi CSDL Dược API: drugs.search()...');
    const result = await client.csdlDuoc.drugs.search('', { page, pageSize });

    const itemCount = result.items?.length || 0;
    const total = result.total || itemCount;
    sendProgress(
      'api_success',
      `Tải danh mục thành công: ${itemCount} thuốc trên trang này (tổng ~${total}).`,
    );
    sendPayload({ result });
  });
}
