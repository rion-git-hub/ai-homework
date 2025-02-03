import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const NEXT_PUBLIC_OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  if (!NEXT_PUBLIC_OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("audio") as Blob | null;

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const apiFormData = new FormData();
    apiFormData.append("file", new Blob([buffer], { type: "audio/webm" }), "audio.webm");
    apiFormData.append("model", "whisper-1"); // Whisper モデルを指定

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NEXT_PUBLIC_OPENAI_API_KEY}`,
      },
      body: apiFormData, // FormData をそのまま渡す
    });

    if (!response.ok) {
      throw new Error("Failed to transcribe audio");
    }

    const data = await response.json();
    return NextResponse.json({ text: data.text });

  } catch (error) {
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
