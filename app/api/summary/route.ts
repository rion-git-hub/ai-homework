import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { history } = await req.json();

    if (!history) {
      return NextResponse.json({ error: "履歴が提供されていません" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });

    const prompt = `以下の会話履歴を元に、回答の総合評価を100文字以内で簡潔に要約してください。\n\n${history}\n\n総合評価:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: prompt }],
      max_tokens: 100,
    });

    const summary = completion.choices[0]?.message?.content || "評価を取得できませんでした。";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
