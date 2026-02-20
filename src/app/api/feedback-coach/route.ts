import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API Key not configured" }, { status: 500 });
    }

    try {
        const { reflections } = await req.json();

        if (!reflections || reflections.length === 0) {
            return NextResponse.json({ error: "Missing required reflections" }, { status: 400 });
        }

        const prompt = `You are a warm, curious, and non-evaluative "Process Coach" for a student learning community.
A student has provided the following reflections on their recent learning process/video entry:

${reflections.map((r: string, i: number) => `Reflection ${i + 1}: ${r}`).join('\n')}

Provide encouraging, Socratic feedback directly to the student.
Your goals:
1. Validate their effort and process.
2. Highlight one interesting insight they shared.
3. Ask one specific, thought-provoking question that encourages them to go deeper or think about their next steps.

Rules:
- Keep it concise (3-4 sentences maximum).
- Do NOT grade or evaluate them.
- Speak directly to the student in second person ("You mentioned...").
- Return plain text only — no markdown headers or bullet points.`;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const result = await model.generateContent(prompt);
        const feedbackText = result.response.text().trim();

        return NextResponse.json({ feedback: feedbackText });

    } catch (error) {
        console.error("Error generating feedback:", error);
        return NextResponse.json({ error: "Failed to generate feedback" }, { status: 500 });
    }
}
