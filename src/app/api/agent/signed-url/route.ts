import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tier = searchParams.get("tier") || "free";

  const agentId =
    tier === "pro" || tier === "plus"
      ? process.env.ELEVENLABS_AGENT_ID_PREMIUM
      : process.env.ELEVENLABS_AGENT_ID;

  if (!agentId) {
    return NextResponse.json({ error: "Agent not configured" }, { status: 500 });
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
    { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to get signed URL" }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({ signedUrl: data.signed_url });
}
