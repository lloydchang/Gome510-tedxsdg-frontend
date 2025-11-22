// File: src/app/api/generateIdeas/route.ts
import { NextResponse, NextRequest } from "next/server";
import OpenAI from "openai";
import { addSpanAttributes } from "../../../lib/observability";

interface OpenAIResponse {
    choices: {
        message: {
            content: string | null;
        };
    }[];
}

const openRouterApiKey = process.env.OPENROUTER_API_KEY;
const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const cloudflareBearerToken = process.env.CLOUDFLARE_BEARER_TOKEN;

if (!openRouterApiKey) {
    console.error("OPENROUTER_API_KEY environment variable not set!");
    // In production, you should throw an error or return a default response here.
}

if (!cloudflareAccountId || !cloudflareBearerToken) {
    console.error("Cloudflare environment variables not set!");
    // In production, you should throw an error or return a default response here.
}

const openaiRouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: openRouterApiKey,
    defaultHeaders: {
        "HTTP-Referer": process.env.YOUR_SITE_URL || "",
        "X-Title": process.env.YOUR_SITE_NAME || "",
    }
});

const openaiCloudflare = new OpenAI({
    apiKey: cloudflareBearerToken,
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/v1`
});

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();
        console.log("Incoming data (generateIdeas):", data);
        console.log("Data types:", typeof data, typeof data.transcript, typeof data.sdg);

        addSpanAttributes({
            'app.request.has_transcript': !!data.transcript,
            'app.request.transcript_length': data.transcript ? data.transcript.length : 0,
            'app.request.sdg_raw': data.sdg
        });

        if (!data || typeof data !== 'object' || !data.transcript || !data.sdg) {
            return NextResponse.json({ error: "Invalid input data. 'transcript' and 'sdg' are required." }, { status: 400 });
        }

        let sdgNumber;
        if (typeof data.sdg === 'string') {
            sdgNumber = parseInt(data.sdg.replace('sdg', ''), 10);
        } else if (typeof data.sdg === 'number') {
            sdgNumber = data.sdg;
        }

        if (isNaN(sdgNumber) || sdgNumber < 1 || sdgNumber > 17) {
            return NextResponse.json({ error: "Invalid 'sdg' value. Must be a number between 1 and 17." }, { status: 400 });
        }

        const systemPrompt = `
Generate a summary, a nonprofit idea, and a title, all related to the provided transcript and SDG, in valid JSON.  Return ONLY JSON. Do NOT include markdown backticks.

Transcript:
${data.transcript}

SDG: ${sdgNumber}

Valid JSON Response Format:
{
  "summary": "string",
  "idea": "string",
  "ideaTitle": "string"
}
        `;

        console.log("Prompt sent to Gemma:", systemPrompt);

        let completion: OpenAIResponse;

        try {
            console.log("Trying to call Gemma API via OpenRouter first...");
            completion = await openaiRouter.chat.completions.create({
                model: "google/gemma-3-27b-it:free",
                messages: [{ role: "system", content: systemPrompt }]
            });
            console.log("Gemma API call via OpenRouter successful.");
            addSpanAttributes({ 'app.ai.provider': 'openrouter', 'app.ai.model': 'google/gemma-3-27b-it:free' });
        } catch (openRouterError) {
            console.warn("OpenRouter Error (trying Cloudflare as fallback):", openRouterError);
            console.log("Trying Cloudflare Workers AI (OpenAI compatible) API as fallback...");
            completion = await openaiCloudflare.chat.completions.create({
                model: "@cf/google/gemma-7b-it-lora",
                // CloudFlare AI worker doesn't seem to support system role messages, hence sending a user role message
                messages: [{ role: "user", content: systemPrompt }]
            });
            console.log("Cloudflare Workers AI API call successful.");
            addSpanAttributes({ 'app.ai.provider': 'cloudflare', 'app.ai.model': '@cf/google/gemma-7b-it-lora' });
        }

        return handleAIResponse(completion);

    } catch (outerError) {
        console.error("General Error:", outerError);
        return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
    }
}

// Function to handle the AI response and extract JSON
function handleAIResponse(completion: OpenAIResponse): NextResponse {
    if (!completion || !completion.choices || !completion.choices.length || !completion.choices[0].message || completion.choices[0].message.content === null) {
        console.error("Invalid response from AI provider:", completion);
        return NextResponse.json({ error: "Invalid response from AI provider" }, { status: 500 });
    }

    let content = completion.choices[0].message.content;

    if (content === null) {
        console.error("AI provider returned null content:", completion);
        return NextResponse.json({ error: "AI provider returned empty content" }, { status: 500 });
    }

    try {
        const jsonResponse = JSON.parse(content); // content is now guaranteed to be a string
        return NextResponse.json(jsonResponse);
    } catch (parseError) {
        console.error("Initial JSON parsing failed:", parseError);
        console.error("Response that failed initial parsing:", content);

        content = content.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const cleanedJsonResponse = JSON.parse(content);
            console.warn("Removed backticks and parsed successfully. Full response:", content);
            return NextResponse.json(cleanedJsonResponse);
        } catch (cleanedParseError) {
            console.error("Parsing failed even after removing backticks:", cleanedParseError);

            try {
                const regex = /{.*}/s;
                const match = content.match(regex);

                if (match) {
                    const extractedJson = JSON.parse(match[0]);
                    console.warn("Used regex fallback.  Full response:", content);
                    return NextResponse.json(extractedJson);
                } else {
                    return NextResponse.json({ error: "Failed to extract JSON after backtick removal and regex", geminiResponse: content }, { status: 500 });
                }

            } catch (regexError) {
                console.error("Regex extraction and parsing failed:", regexError);
                return NextResponse.json({ error: "JSON parsing and extraction failed", geminiResponse: content }, { status: 500 });

            }
        }
    }
}
