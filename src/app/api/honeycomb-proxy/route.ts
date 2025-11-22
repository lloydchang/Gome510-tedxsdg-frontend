// File: src/app/api/honeycomb-proxy/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch("https://api.honeycomb.io/v1/traces", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Honeycomb-Team": process.env.HONEYCOMB_API_KEY || "",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });

  } catch (err) {
    console.error("Error sending event to Honeycomb:", err); // log the error
    return NextResponse.json(
      { error: "Failed to send event", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
