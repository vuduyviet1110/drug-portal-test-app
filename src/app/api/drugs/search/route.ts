import { getClient } from '@/lib/client';
import { createNdjsonStream } from '@/lib/ndjson-stream';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';

  return createNdjsonStream(async (sendProgress, sendPayload) => {
    sendProgress('request_received', `Nhận yêu cầu tìm kiếm thuốc với từ khóa "${keyword || '(trống)'}"...`);
    sendProgress('init_client', 'Đang khởi tạo SDK client và kiểm tra kết nối/proxy...');

    const client = await getClient(sendProgress);
    if (!client || !client.csdlDuoc) {
      throw new Error('Client chưa được cấu hình. Vui lòng điền thông tin tài khoản trong tab Cấu hình.');
    }

    sendProgress('calling_api', `Đang gọi CSDL Dược API: drugs.search("${keyword}")...`);
    const result = await client.csdlDuoc.drugs.search(keyword);

    const itemCount = result.items?.length || 0;
    const total = result.total || itemCount;
    sendProgress('api_success', `Tìm kiếm thành công: ${itemCount} kết quả (tổng ~${total}).`);
    sendPayload({ result });
  });
}
