import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
    if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ error: "Gemini API Key not configured" }, { status: 500 });
    }

    try {
        const { title, description, reflections } = await req.json();

        if (!title && !reflections) {
            return NextResponse.json({ error: "Missing required content" }, { status: 400 });
        }

        const prompt = `You are an expert facilitator for a student learning community called Process Plus.
Your goal is to foster deep, process-oriented discussion rather than simple praise.

A student has just submitted a learning entry.
Title/Topic: ${title || "A Learning Process"}
Description: ${description || "No description provided."}
${reflections && reflections.length > 0 ? `Student's Reflections on their process:\n${reflections.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}` : ""}

Based on this entry, generate exactly 3 open-ended, curious discussion questions that peers or teachers could ask this student to help them reflect further on their process, overcome a hurdle, or expand their thinking.

The questions should be:
1. Warm and encouraging, but intellectually rigorous.
2. Centered on *how* they learned or *what* they struggled with, not just congratulating the final product.
3. Formatted as a valid JSON array of 3 strings with no other text, markdown, or wrapper objects.

Example output:
["What was the most surprising thing you discovered?", "How did you decide to move forward?", "What would you teach someone else first?"]`;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" },
        });

        const result = await model.generateContent(prompt);
        const resultText = result.response.text().trim();

        let questions: string[] = [];
        try {
            questions = JSON.parse(resultText);
        } catch {
            // Fallback: strip any markdown fences
            const cleaned = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
            questions = JSON.parse(cleaned);
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
