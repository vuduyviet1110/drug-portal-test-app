import { NextResponse } from 'next/server';

export async function GET() {
  const results: any = {};
  
  try {
    const res = await fetch('https://api-sandbox.csdlduoc.com.vn', {
      method: 'HEAD'
    });
    results.direct = {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries())
    };
  } catch (err: any) {
    results.direct = {
      error: err.message,
      stack: err.stack
    };
  }
  
  return NextResponse.json(results);
}
