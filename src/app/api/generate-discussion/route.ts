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
        const { title, description, reflections } = await req.json();

        // Basic validation
        if (!title && !reflections) {
            return NextResponse.json({ error: "Missing required content" }, { status: 400 });
        }

        const prompt = `
You are an expert facilitator for a student learning community called Process Plus. 
Your goal is to foster deep, process-oriented discussion rather than simple praise.

A student has just submitted a learning entry. 
Title/Topic: ${title || "A Learning Process"}
Description: ${description || "No description provided."}
${reflections && reflections.length > 0 ? `Student's Reflections on their process:\n${reflections.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}` : ""}

Based on this entry, generate exactly 3 open-ended, curious discussion questions that peers or teachers could ask this student to help them reflect further on their process, overcome a hurdle, or expand their thinking.

The questions should be:
1. Warm and encouraging, but intellectually rigorous.
2. Centered on *how* they learned or *what* they struggled with, not just congratulating the final product.
3. Formatted as a simple JSON array of strings. Do not include any other markdown, conversational text, or wrapper objects. Just the array.

Example output:
[
  "What was the most surprising thing you discovered when trying this approach?",
  "You mentioned struggling with the second step—how did you eventually decide to move forward?",
  "If you were to teach this concept to someone else tomorrow, what's the first thing you'd emphasize?"
]
`;

        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 300,
            temperature: 0.7,
            system: "You output only valid JSON arrays of strings.",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        const resultText = response.content[0].type === 'text' ? response.content[0].text : '[]';
        let questions: string[] = [];

        try {
            questions = JSON.parse(resultText);
        } catch (e) {
            // Fallback parsing if Claude returned it with some markdown despite instructions
            const cleanedText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
            questions = JSON.parse(cleanedText);
        }

        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error("Failed to parse questions array");
        }

        return NextResponse.json({ questions });

    } catch (error) {
        console.error("Error generating discussion:", error);
        return NextResponse.json({ error: "Failed to generate discussion prompts" }, { status: 500 });
    }
}
