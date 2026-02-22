import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API Key not configured" }, { status: 500 });
    }

    try {
        const { reflections, originalPrompt } = await req.json();

        if (!reflections || reflections.length === 0) {
            return NextResponse.json({ error: "Missing reflections" }, { status: 400 });
        }

        const prompt = `You are a curriculum designer for an educational platform called Process Plus, where students submit short video responses to prompts and reflect on their learning process.

A student submitted a response to this original project prompt:
"${originalPrompt}"

The student's written reflections were:
${reflections.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

A teacher found this student's thinking so interesting that they want to "Spark" it — turn it into a new project prompt for the whole class to respond to.

Generate a new project for the class that:
1. Is inspired by the specific ideas or questions the student raised in their reflections
2. Invites the whole class to explore that idea through their own process
3. Focuses on learning process (struggles, thinking, discovery) not just final answers
4. Is open-ended enough that many students can find their own angle

Return a JSON object with exactly these two fields:
- "title": A short, catchy project title (3-7 words, no quotes around it)
- "promptText": The full prompt students will respond to (2-4 sentences, warm and inviting, starts with an action verb)

Example format:
{"title": "What Made You Change Your Mind?", "promptText": "Tell us about a moment in your learning when you realized you were wrong about something — and changed direction. What triggered that shift? What did it feel like to start over?"}`;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" },
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        let parsed: { title: string; promptText: string };
        try {
            parsed = JSON.parse(text);
        } catch {
            const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
            parsed = JSON.parse(cleaned);
        }

        if (!parsed.title || !parsed.promptText) {
            throw new Error("Invalid response format from AI");
        }

        return NextResponse.json(parsed);
    } catch (error) {
        console.error("Error generating spark:", error);
        return NextResponse.json({ error: "Failed to generate spark" }, { status: 500 });
    }
}
