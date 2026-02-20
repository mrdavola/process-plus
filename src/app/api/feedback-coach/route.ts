import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(req: Request) {
    if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: "Anthropic API Key not configured" }, { status: 500 });
    }

    try {
        const { reflections } = await req.json();

        if (!reflections || reflections.length === 0) {
            return NextResponse.json({ error: "Missing required reflections" }, { status: 400 });
        }

        const prompt = `
You are a warm, curious, and non-evaluative "Process Coach" for a student learning community.
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
- Speak directly to the student in the second person ("You mentioned...").
- Do not use markdown headers, just return plain text.
`;

        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 300,
            temperature: 0.6,
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        const feedbackText = response.content[0].type === 'text' ? response.content[0].text : '';

        return NextResponse.json({ feedback: feedbackText });

    } catch (error) {
        console.error("Error generating feedback:", error);
        return NextResponse.json({ error: "Failed to generate feedback" }, { status: 500 });
    }
}
