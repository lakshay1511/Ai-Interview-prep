import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  const { type, role, level, techstack, amount, userid } = await request.json();

  try {
    // Validate required parameters
    if (!type || !role || !level || !userid || !amount) {
      return Response.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Handle techstack properly - if it's undefined or not a string, use an empty array
    const techstackArray =
      typeof techstack === "string"
        ? techstack.split(",")
        : Array.isArray(techstack)
        ? techstack
        : [];

    const techstackPrompt =
      techstackArray.length > 0
        ? techstackArray.join(", ")
        : "No specific technologies";

    const { text: questions } = await generateText({
      model: google("gemini-2.5-pro"),
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstackPrompt}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
        Return the questions formatted like this:
        ["Question 1", "Question 2", "Question 3"]
        
        Thank you! <3
    `,
    });

    const interview = {
      role: role,
      type: type,
      level: level,
      techstack: techstackArray,
      questions: JSON.parse(questions),
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    await db.collection("interviews").add(interview);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return Response.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}
