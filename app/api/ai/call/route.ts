import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    console.log("Chat request received:", prompt?.substring(0, 50) + "...");

    if (!prompt) {
      return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
    }

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      max_tokens: 2048,
    });

    console.log("Chat response sent successfully");
    return NextResponse.json({ text: response.choices[0]?.message?.content || "" });
  } catch (err) {
    const error = err as Error;
    console.error("Chat Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}