// File: src/app/generate/funding/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // Import remark-gfm for GitHub Flavored Markdown
import jsPDF from "jspdf";
import { addSpanAttributes } from "../../../lib/observability";

export default function FundingPage() {
  const [investors, setInvestors] = useState<string>("");
  const [grants, setGrants] = useState<string>("");
  const [grantProposal, setGrantProposal] = useState<string>("");
  // const [pitchText, setPitchText] = useState<string>(''); 
  // const [pitchAudio, setPitchAudio] = useState<string | null>(null); 
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [investorsCollapsed, setInvestorsCollapsed] = useState(true);
  const [grantsCollapsed, setGrantsCollapsed] = useState(true);
  // const [pitchCollapsed, setPitchCollapsed] = useState(true); 
  // const [generatingAudio, setGeneratingAudio] = useState(false); 

  useEffect(() => {
    const fetchData = async () => {
      // Check if we have cached results in local storage
      const cachedGrants = localStorage.getItem("grantResults");
      const cachedInvestors = localStorage.getItem("investorResults");
      const cachedGrantProposal = localStorage.getItem("grantProposalResults");
      // const cachedPitchText = localStorage.getItem("pitchTextResults"); 

      if (cachedGrants && cachedInvestors && cachedGrantProposal) {
        setGrants(JSON.parse(cachedGrants));
        setInvestors(JSON.parse(cachedInvestors));
        setGrantProposal(JSON.parse(cachedGrantProposal));
        // setPitchText(JSON.parse(cachedPitchText)) 
        setLoading(false);
        addSpanAttributes({ 'app.cache.hit': true, 'app.cache.key': 'fundingData' });
      } else {
        // If no cached results, make the API call
        try {
          // Fetch data
          const selectedIdea = JSON.parse(localStorage.getItem("selectedIdea") || "{}");

          // Extract the SDG number (e.g., "sdg12")
          const sdgNumber = selectedIdea.sdg.split(':')[0].trim();

          // Consistent Payload Structure for All Requests
          const requestPayload = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              idea: {
                name: selectedIdea.ideaTitle,
                mission: selectedIdea.idea,
                goals: [],
                targetMarket: {},
                primaryProduct: "",
                geography: {},
                keyPrograms: [],
                sdgs: [sdgNumber],
              },
            }),
          };

          // Fetch Grants
          console.debug("Grant Info Request Headers:", requestPayload.headers);
          console.debug("Grant Info Request Body:", requestPayload.body);

          const grantResponse = await fetch(
            "https://ted-murex.vercel.app/grantInfo",
            requestPayload
          );

          console.debug("Grant Info Response Status:", grantResponse.status);
          console.debug("Grant Info Response Headers:", grantResponse.headers);

          if (grantResponse.ok) {
            // Get text response directly
            const grantsText = await grantResponse.text();
            console.debug("Grant Info Response Body:", grantsText);

            localStorage.setItem("grantResults", JSON.stringify(grantsText));
            setGrants(grantsText);
          } else {
            console.error("Error fetching grants:", grantResponse.statusText);
            setGrants("Error loading grant information. Please try again later.");
          }

          // Fetch Grant Proposal
          console.debug("Grant Proposal Request Headers:", requestPayload.headers);
          console.debug("Grant Proposal Request Body:", requestPayload.body);

          const grantProposalResponse = await fetch(
            "https://ted-murex.vercel.app/getGrantProposal",
            requestPayload
          );

          console.debug("Grant Proposal Response Status:", grantProposalResponse.status);
          console.debug("Grant Proposal Response Headers:", grantProposalResponse.headers);

          if (grantProposalResponse.ok) {
            // Get text response directly
            const grantProposalText = await grantProposalResponse.text(); // Using the CORRECT response object
            console.debug("Grant Proposal Response Body:", grantProposalText);

            localStorage.setItem("grantProposalResults", JSON.stringify(grantProposalText));
            setGrantProposal(grantProposalText);
          } else {
            console.error("Error fetching grant proposal:", grantProposalResponse.statusText);
            setGrantProposal("Error loading grant proposal. Please try again later.");
          }

          // Fetch Investors
          console.debug("Investors Request Headers:", requestPayload.headers);
          console.debug("Investors Request Body:", requestPayload.body);

          const investorResponse = await fetch(
            "https://ted-murex.vercel.app/investors",
            requestPayload
          );

          console.debug("Investors Response Status:", investorResponse.status);
          console.debug("Investors Response Headers:", investorResponse.headers);

          if (investorResponse.ok) {
            // Get text response directly
            const investorsText = await investorResponse.text();
            console.debug("Investors Response Body:", investorsText);

            localStorage.setItem("investorResults", JSON.stringify(investorsText));
            setInvestors(investorsText);
          } else {
            console.error("Error fetching investors:", investorResponse.statusText);
            setInvestors("Error loading investor information. Please try again later.");
          }

          // Fetch pitch 
          // const pitchTextResponse = await fetch(
          //   "https://ted-murex.vercel.app/generatePitchText",
          //   {
          //     method: "POST",
          //     headers: { "Content-Type": "application/json" },
          //     body: JSON.stringify(request), 
          //   }
          // );
          // const pitchTextData = await pitchTextResponse.json();
          // console.log('pitchTextData', pitchTextData)
          // localStorage.setItem("pitchTextResults", JSON.stringify(pitchTextData.pitch_text));
          // setPitchText(pitchTextData.pitch_text); 

        } catch (error) {
          console.error("Error fetching results:", error);
          // Handle errors more generally
          setInvestors("An error occurred. Please try again later.");
          setGrants("An error occurred. Please try again later.");
          setGrantProposal("An error occurred. Please try again later.");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, []);

  const handleGeneratePDF = () => {
    setGeneratingPDF(true);
    addSpanAttributes({ 'app.pdf.generating': true });
    try {
      const doc = new jsPDF();

      // Split the content into lines
      const lines = doc.splitTextToSize(grantProposal, 180);

      let y = 10;
      lines.forEach((line: string) => {
        if (y > 280) {
          doc.addPage();
          y = 10;
        }
        doc.text(line, 10, y);
        y += 7;
      });

      doc.save("grant_proposal.pdf");
      addSpanAttributes({ 'app.pdf.success': true, 'app.pdf.pages': lines.length / 40 }); // Approx pages
    } catch (error) {
      console.error("Error generating PDF:", error);
      addSpanAttributes({ 'app.pdf.success': false, 'app.pdf.error': (error as Error).message });
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const toggleSection = (section: "investors" | "grants" | "pitch") => {
    if (section === "investors") {
      setInvestorsCollapsed(!investorsCollapsed);
    } else if (section === "grants") {
      setGrantsCollapsed(!grantsCollapsed);
    }
    // else { 
    //   setPitchCollapsed(!pitchCollapsed) 
    // }
  };

  // const handleGenerateAudio = async () => {
  //   // ... (Your existing code) 
  // };

  if (loading) {
    return <div>Loading...</div>;
  }

  // Function to format the text from API
  const formatApiResponse = (text: string) => {
    // Remove leading and trailing double quotes
    const trimmedText = text.replace(/^"|"$/g, '');

    // Decode escaped newlines to actual newlines
    const decodedText = trimmedText.replace(/\\n/g, '\n\n\n');

    // Bold the "Citations" section
    const boldedCitations = decodedText.replace(
      /(Citations:)/g,
      '**$1**'
    );

    // Replace ==== with --- (or any other markdown horizontal rule character)
    const horizontalRuleFixed = boldedCitations.replace(
      /={4,}/g, // Match 4 or more equal signs
      '---'
    );

    return horizontalRuleFixed;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => toggleSection('investors')}
          className="text-3xl font-bold w-full text-left flex justify-between items-center bg-gray-200 p-4 rounded-t"
        >
          <span>Investors</span>
          <span>{investorsCollapsed ? '▼' : '▲'}</span>
        </button>
        {!investorsCollapsed && (
          <div className="bg-gray-100 shadow-md rounded-b px-8 pt-6 pb-8">
            {/* Render formatted investor text */}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]} // Use remark-gfm for better Markdown support 
            >
              {formatApiResponse(investors)}
            </ReactMarkdown>
          </div>
        )}
      </div>

      <div className="mb-6">
        <button
          onClick={() => toggleSection('grants')}
          className="text-3xl font-bold w-full text-left flex justify-between items-center bg-gray-200 p-4 rounded-t"
        >
          <span>Grants</span>
          <span>{grantsCollapsed ? '▼' : '▲'}</span>
        </button>
        {!grantsCollapsed && (
          <div className="bg-gray-100 shadow-md rounded-b px-8 pt-6 pb-8">
            {/* Render formatted grant text */}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]} // Use remark-gfm for better Markdown support 
            >
              {formatApiResponse(grants)}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* <div className="mb-6"> 
        <button
          onClick={() => toggleSection('pitch')}
          className="text-3xl font-bold w-full text-left flex justify-between items-center bg-gray-200 p-4 rounded-t"
        >
          <span>Pitch</span>
          <span>{pitchCollapsed ? '▼' : '▲'}</span>
        </button>
        {!pitchCollapsed && (
          <div className="bg-gray-100 shadow-md rounded-b px-8 pt-6 pb-8">
            <ReactMarkdown 
              rehypePlugins={[rehypeRaw]} // Enable HTML parsing with rehypeRaw (if needed)
            >
              {pitchText} 
            </ReactMarkdown> 
          </div>
        )}
      </div>  */}

      {/* {pitchAudio && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Pitch Audio</h2>
          <audio controls src={pitchAudio}>
            Your browser does not support the audio element.
          </audio>
        </div>
      )} */}

      <div className="flex space-x-4">
        <button
          onClick={handleGeneratePDF}
          disabled={generatingPDF}
          className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {generatingPDF ? 'Generating PDF...' : 'Generate Grant Proposal PDF'}
        </button>

        {/* <button
          onClick={handleGenerateAudio}
          disabled={generatingAudio}
          className="mt-4 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {generatingAudio ? 'Generating Audio...' : 'Generate & Download Pitch Audio'}
        </button> */}
      </div>
    </div>
  );
}
