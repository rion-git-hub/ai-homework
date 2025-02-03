import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const NEXT_PUBLIC_OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  if (!NEXT_PUBLIC_OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 });
  }

  try {
    const { question, answer } = await req.json();

    if (!question || !answer) {
      return NextResponse.json({ error: "Missing question or answer" }, { status: 400 });
    }

    // ChatGPT に送信するプロンプト
    const prompt = `
    質問: "${question}"
    ユーザーの回答: "${answer}"
    
    回答が正しいか判断してください。
    - 正しい場合: 「正解です！」と返信をして、「では次の質問に行きます」と答える。
    - 間違っている場合: 間違いの理由を簡単に説明し、適切なヒントを提供してください。
    `;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NEXT_PUBLIC_OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4", // または "gpt-3.5-turbo"
        messages: [{ role: "system", content: "あなたは親切な先生です。" }, { role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch ChatGPT response");
    }

    const data = await response.json();
    return NextResponse.json({ evaluation: data.choices[0].message.content });

  } catch (error) {
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
