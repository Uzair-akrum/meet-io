import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Initialize the model - using Gemini 2.0 Flash
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp"
    });

    const prompt = `
  Create a detailed and structured summary of the following conversation transcript. The summary should be organized into clear sections with headings and points, and action items should be listed separately. The entire summary, including sections and action items, should be wrapped in XML tags to maintain a hierarchical structure. Ensure the summary captures main topics, key points, important decisions, and conclusions, while maintaining a professional and objective tone. Use the provided example as a guide for the format and structure.
  Example XML Structure:
  <Summary>
  <Section title="Project Overview and Introduction">
    <Point>Speaker 2 apologizes for the misunderstanding about the meeting time and confirms readiness to proceed.</Point>
    <Point>Speaker 2 introduces a high-level presentation to provide a better understanding of the project.</Point>
    <!-- Add more points as needed -->
  </Section>
  <Section title="Introduction of Team Members">
    <Point>Speaker 2 greets new team members Osama, Uzairma, and Rafay.</Point>
    <!-- Add more points as needed -->
  </Section>
  <!-- Add more sections as needed -->
  <ActionItems>
    <Item>Set up the development environment, including a GitHub account and cloud server</Item>
    <Item>Align on the required items from Sean's end to initiate the code setup</Item>
    <!-- Add more action items as needed -->
  </ActionItems>
</Summary>
Ensure that the summary is easy to read and understand, and that it follows the format and structure outlined in the example.
      ${text}
    `;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}