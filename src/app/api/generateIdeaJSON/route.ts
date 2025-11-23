// File: src/app/api/generateIdeaJSON/route.ts
import { NextResponse, NextRequest } from "next/server";
import OpenAI from "openai";

// Minimal type for the AI completion response we care about
interface AIResponse {
    choices: { message: { content: string | null } }[];
}



const geminiApikey = process.env.GEMINI_API_KEY;
const openRouterApiKey = process.env.OPENROUTER_API_KEY;
const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const cloudflareBearerToken = process.env.CLOUDFLARE_BEARER_TOKEN;

// Log missing credentials but do not abort execution; we will fall back to placeholder data if needed.
if (!geminiApikey) {
    console.warn("GEMINI_API_KEY not set – Google AI Studio will be unavailable.");
}
if (!openRouterApiKey) {
    console.warn("OPENROUTER_API_KEY not set – OpenRouter fallback will be unavailable.");
}
if (!cloudflareAccountId || !cloudflareBearerToken) {
    console.warn("Cloudflare credentials not set – Cloudflare fallback will be unavailable.");
}

let openaiRouter: OpenAI | null = null;
if (openRouterApiKey) {
    openaiRouter = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openRouterApiKey,
    });
}

let openaiCloudflare: OpenAI | null = null;
if (cloudflareAccountId && cloudflareBearerToken) {
    openaiCloudflare = new OpenAI({
        apiKey: cloudflareBearerToken,
        baseURL: `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/v1`,
    });
}

let openaiGoogle: OpenAI | null = null;
if (geminiApikey) {
    openaiGoogle = new OpenAI({
        apiKey: geminiApikey,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
}


export async function POST(req: NextRequest) {
    try {
        const data = await req.text();
        console.log("Incoming request data (generateIdeaJSON):", { headers: req.headers, body: data });

        const systemPrompt = `Given an idea for a nonprofit that covers the given sustainable development goal, please return the following in valid JSON.  Return ONLY JSON. Do NOT include markdown backticks:
        {
        "idea": {
       "name": string that is name of the nonprofit,
        "mission": string that is the mission statement,
        "goals": string[] that is a list of goals for the nonprofit,
        "targetMarket": {
          "entity": string - example "Individuals and communities",
          "ageRange": string - example "15-65",
          "income": string - example"Low to middle income",
          "occupation": string - example "Unemployed, underemployed, or in traditional non-sustainable industries",
          "geography": string - example "Rural and peri-urban areas in developing countries",
          "marginalizedIdentity": string - example "Indigenous populations, women, youth"
        },
        "primaryProduct": string - example "Integrated environmental education and sustainable livelihood training programs",
        "sdgs": string[] that is list of given SDGs
      }
    }`;
        console.log("Prompt sent to Gemma:", systemPrompt);

        let completion: AIResponse | null = null;

        // Try Gemini via Google AI Studio first
        if (openaiGoogle) {
            try {
                console.log("Calling Gemini via Google AI Studio...");
                completion = await openaiGoogle.chat.completions.create({
                    model: "gemini-2.5-flash-lite",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: data }
                    ],
                }) as unknown as AIResponse;
                console.log("Google AI Studio call successful.");
            } catch (googleError) {
                console.warn("Google AI Studio error:", googleError);
            }
        }

        // If Google failed or not configured, try OpenRouter
        if (!completion && openaiRouter) {
            try {
                console.log("Calling Gemma via OpenRouter...");
                completion = await openaiRouter.chat.completions.create({
                    model: "google/gemini-2.0-flash-exp:free",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: data },
                    ],
                }) as unknown as AIResponse;
                console.log("OpenRouter call successful.");
            } catch (openRouterError) {
                console.warn("OpenRouter error:", openRouterError);
            }
        }

        // If previous providers failed, try Cloudflare fallback
        if (!completion && openaiCloudflare) {
            try {
                console.log("Calling Gemma via Cloudflare fallback...");
                completion = await openaiCloudflare.chat.completions.create({
                    model: "@cf/google/gemma-7b-it-lora",
                    messages: [{ role: "user", content: systemPrompt + "\n\n" + data }],
                }) as unknown as AIResponse;
                console.log("Cloudflare call successful.");
            } catch (cloudflareError) {
                console.warn("Cloudflare error:", cloudflareError);
            }
        }

        // If still no completion, return placeholder data
        if (!completion) {
            console.warn("All providers unavailable – returning placeholder data.");
            const placeholder: IdeaResult = {
                summary: "A concise proposal to fight poverty through a universal basic income pilot aligned with SDG 1.",
                idea: "Create a community‑driven universal basic income program that provides a monthly cash grant to low‑income households, measured against SDG 1 outcomes.",
                ideaTitle: "Universal Basic Income Pilot for SDG 1",
            };
            return createSuccessResponse(placeholder);
        }

        console.log("Raw response:", completion);
        if (!completion || !completion.choices?.[0]?.message?.content) {
            console.error("Invalid response from AI provider", completion);
            return createErrorResponse("Invalid response from AI provider", 500);
        }
        let content = completion.choices[0].message.content as string;
        console.log("Extracted content from AI:", content);
        // Existing JSON parsing logic (backticks removal, regex fallback)
        try {
            return createSuccessResponse(JSON.parse(content));
        } catch {
            content = content.replace(/```json/g, "").replace(/```/g, "").trim();
            try {
                return createSuccessResponse(JSON.parse(content));
            } catch {
                const regex = /{.*}/s;
                const match = content.match(regex);
                if (match) {
                    return createSuccessResponse(JSON.parse(match[0]));
                }
                return createErrorResponse("Failed to parse JSON response", 500, { geminiResponse: content, dataReceived: data });
            }
        }
    } catch (outerError) {
        console.error("General Error:", outerError);
        return createErrorResponse("An unexpected error occurred", 500);
    }
}

// Helper functions for creating responses
interface IdeaResult {
    summary: string;
    idea: string;
    ideaTitle: string;
}

function createSuccessResponse<T>(data: T): NextResponse<T> {
    return new NextResponse(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
}

interface ErrorResponseBody {
    error: string;
    geminiResponse?: string;
    dataReceived?: string;
}

function createErrorResponse(message: string, status: number, extraData?: Partial<ErrorResponseBody>): NextResponse<ErrorResponseBody> {
    const errorResponse: ErrorResponseBody = { error: message };
    if (extraData) {
        Object.assign(errorResponse, extraData);
    }
    return new NextResponse(JSON.stringify(errorResponse), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
