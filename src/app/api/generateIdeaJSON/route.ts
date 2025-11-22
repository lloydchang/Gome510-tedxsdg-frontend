// File: src/app/api/generateIdeaJSON/route.ts
import { NextResponse, NextRequest } from "next/server";
import OpenAI from "openai";

const openRouterApiKey = process.env.OPENROUTER_API_KEY;
const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const cloudflareBearerToken = process.env.CLOUDFLARE_BEARER_TOKEN;

if (!openRouterApiKey) {
    console.error("OPENROUTER_API_KEY environment variable not set!");
    throw new Error("OPENROUTER_API_KEY environment variable not set!");
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
        const data = await req.text();
        console.log("Incoming request data (generateIdeaJSON):", {
            headers: req.headers,
            body: data
        });

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

        let completion;

        try {
            console.log("About to call Gemma API via OpenRouter...");
            completion = await openaiRouter.chat.completions.create({
                model: "google/gemma-3-27b-it:free",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: data }
                ]
            });
            console.log("Gemma API call successful.");
        } catch (openRouterError) {
            console.warn("OpenRouter Error (trying Cloudflare as fallback):", openRouterError);
            console.log("Trying Cloudflare Workers AI (OpenAI compatible) API as fallback...");
            completion = await openaiCloudflare.chat.completions.create({
                model: "@cf/google/gemma-7b-it-lora", 
                messages: [
                    // CloudFlare AI worker doesn't seem to support system role messages, hence sending a user role message
                    { role: "user", content: systemPrompt + '\n\n' + data } 
                ]
            });
            console.log("Cloudflare Workers AI API call successful.");
        }

        console.log("Raw response:", completion);

        if (!completion || !completion.choices || !completion.choices.length || !completion.choices[0].message || !completion.choices[0].message.content) {
            console.error("Invalid response from Gemma via OpenRouter:", completion);
            return createErrorResponse("Invalid response from Gemma", 500);
        }

        let content = completion.choices[0].message.content;
        console.log("Extracted content from Gemma:", content);

        try {
            const jsonResponse = JSON.parse(content);
            return createSuccessResponse(jsonResponse);
        } catch (parseError) {
            console.error("Initial JSON parsing failed:", parseError);
            console.error("Response that failed initial parsing:", content);

            content = content.replace(/```json/g, '').replace(/```/g, '').trim();

            try {
                const cleanedJsonResponse = JSON.parse(content);
                console.warn("Removed backticks and parsed successfully. Full response:", content);
                return createSuccessResponse(cleanedJsonResponse);
            } catch (cleanedParseError) {
                console.error("Parsing failed even after removing backticks:", cleanedParseError);

                try {
                    const regex = /{.*}/s;
                    const match = content.match(regex);

                    if (match) {
                        const extractedJson = JSON.parse(match[0]);
                        console.warn("Used regex fallback. Full response:", content);
                        return createSuccessResponse(extractedJson);
                    } else {
                        return createErrorResponse("Failed to extract JSON after backtick removal and regex", 500, { geminiResponse: content, dataReceived: data });
                    }

                } catch (regexError) {
                    console.error("Regex extraction and parsing failed:", regexError);
                    return createErrorResponse("JSON parsing and extraction failed", 500, { geminiResponse: content, dataReceived: data });
                }
            }
        }


    } catch (outerError) {
        console.error("General Error:", outerError);
        return createErrorResponse("An unexpected error occurred", 500);
    }
}

// Helper functions for creating responses
function createSuccessResponse<T>(data: T): NextResponse<T> {
    return new NextResponse(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" }
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
        status: status,
        headers: { "Content-Type": "application/json" }
    });
}
