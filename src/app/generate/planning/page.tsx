// File: src/app/generate/planning/page.tsx
"use client";

import { marked } from "marked";
import React, { useState, useEffect } from "react";
// import { fetchLLMResults } from "@/lib/utils";
import { addSpanAttributes } from "../../../lib/observability";

// Define a request object with default values
const request = {
  businessName: "",
  industry: "",
  goals: "",
};

export default function PlanningPage() {
  const [results, setResults] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [planCollapsed, setPlanCollapsed] = useState(true);
  // const [grants, setGrants] = useState<any>(null); // Replace 'any' with the actual type of your grant data

  useEffect(() => {
    const fetchData = async () => {
      // Check if we have cached results in local storage
      const cachedResults = localStorage.getItem("planningResults");

      if (cachedResults && cachedResults !== "undefined" && typeof cachedResults === 'string') {
        // If we have cached results, use them
        setResults(JSON.parse(cachedResults));
        setLoading(false);
        addSpanAttributes({ 'app.cache.hit': true, 'app.cache.key': 'planningResults' });
      } else {
        // If no cached results, make the API call
        try {
          // const newResults = await fetchLLMResults();
          // Fetch business plans

          // Store the request method
          const requestMethod = "POST";

          const grantResponse = await fetch(
            "https://budhrajaankita-ted.vercel.app/business_plan_roadmap",
            {
              method: requestMethod, // Use the stored method
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(request),
            }
          );

          // Log request details (use the stored requestMethod)
          console.debug("Business Plan Request:", {
            method: requestMethod,
            url: grantResponse.url,
            headers: grantResponse.headers,
            body: request,
          });

          const grantData = await grantResponse.json();

          // Log response details
          console.debug("Business Plan Response:", {
            status: grantResponse.status,
            statusText: grantResponse.statusText,
            headers: grantResponse.headers,
            body: grantData,
          });

          addSpanAttributes({
            'app.cache.hit': false,
            'app.api.status': grantResponse.status,
            'app.api.url': grantResponse.url
          });

          // Check if the API response contains the markdown content
          if (grantData.businessPlanMarkdown) {
            const markdownString = grantData.businessPlanMarkdown;
            setResults(markdownString);
            localStorage.setItem("planningResults", JSON.stringify(markdownString));
            localStorage.setItem("grantResults", JSON.stringify(grantData));
            // setGrants(grantData); 
          } else {
            console.error("Error: Markdown content not found in API response");
            // Set an error message if markdown is not found
            setResults("Error loading business plan. Please try again later.");
          }

          // Store the new results in local storage
          // localStorage.setItem("llmResults", JSON.stringify(newResults));
          // setResults(newResults);
        } catch (error) {
          console.error("Error fetching LLM results:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, []); // Empty dependency array ensures this runs only once on component mount

  if (loading) {
    return <div>Loading...</div>;
  }

  // Function to format the text from API
  const formatApiResponse = (text: string) => {
    // Replace '\n' with '<br/>' for single line breaks
    // Replace '\n\n' with '<br/><br/>' for double line breaks
    const formattedText = text.replace(/\n/g, '<br/>').replace(/\n\n/g, '<br/><br/>');

    // Bold the "Citations" section
    const boldedCitations = formattedText.replace(
      /(Citations:)/g,
      '**$1**'
    );

    return marked.parse(boldedCitations); // Parse the markdown
  };

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => setPlanCollapsed(!planCollapsed)}
          className="text-3xl font-bold w-full text-left flex justify-between items-center bg-gray-200 p-4 rounded-t"
        >
          <span>Business Plan</span>
          <span>{planCollapsed ? '▼' : '▲'}</span>
        </button>
        {!planCollapsed && (
          <div className="bg-gray-100 shadow-md rounded-b px-8 pt-6 pb-8">
            {/* Check if 'results' is a string before rendering it as markdown */}
            {typeof results === 'string' ? (
              <div dangerouslySetInnerHTML={{ __html: formatApiResponse(results) }}></div>
            ) : (
              <div>Error: Invalid data format for business plan.</div>
            )}
          </div>
        )}
      </div>

      {/* You can use the 'grants' state here to display grant information */}
      {/* Example: */}
      {/* {grants && (
        <div>
          <h2>Available Grants:</h2>
          {/* ... Display grant details from 'grants' ... */}
      {/* </div>
      )} */}
    </div>
  );
}
