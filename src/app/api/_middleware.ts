// File: src/app/api/_middleware.ts
import { NextResponse } from "next/server";

export function middleware() {
return NextResponse.next();
}
