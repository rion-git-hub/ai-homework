import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  let text = "";

  try {
    const body = await req.json();
    text = body.text?.trim() || ""; // 空チェックを追加
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON input" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "Missing text in request body" }, { status: 400 });
  }

  const NEXT_PUBLIC_OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  if (!NEXT_PUBLIC_OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NEXT_PUBLIC_OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: "alloy"
      })
    });

    if (!response.ok) {
      throw new Error("Failed to fetch TTS");
    }

    const audioBuffer = await response.arrayBuffer();
    return new Response(audioBuffer, {
      headers: { "Content-Type": "audio/mpeg" }
    });

  } catch (error) {
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
