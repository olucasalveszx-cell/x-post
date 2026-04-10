import { NextRequest, NextResponse } from "next/server";

const store = (globalThis as any).__mediaStore as Map<string, { b64: string; mime: string; exp: number }>;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const entry = store?.get(params.id);
  if (!entry || entry.exp < Date.now()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = Buffer.from(entry.b64, "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": entry.mime,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
