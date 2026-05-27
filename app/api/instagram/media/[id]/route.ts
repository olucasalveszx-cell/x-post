import { NextRequest, NextResponse } from "next/server";

// Este endpoint não é mais usado — o Blob é acessado diretamente pelo Instagram via URL pública.
export async function GET(_req: NextRequest) {
  return new NextResponse("Not found", { status: 404 });
}
