// File: src/app/generate/inspiration/page.tsx
'use client'

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { addSpanAttributes } from '../../../lib/observability';

interface SDG {
  id: string;
  name: string;
  icon: string;
}

interface Summary {
  url: string;
  summary: string;
  idea: string;
  ideaTitle: string;
}

interface Idea {
  idea: string;
  ideaTitle: string;
  sdg?: string;
  url?: string;
}

const SDGs: SDG[] = [
  { id: "sdg1", name: "No Poverty", icon: "/assets/sdg1.svg" },
  { id: "sdg2", name: "Zero Hunger", icon: "/assets/sdg2.svg" },
  { id: "sdg3", name: "Good Health and Well-being", icon: "/assets/sdg3.svg" },
  { id: "sdg4", name: "Quality Education", icon: "/assets/sdg4.svg" },
  { id: "sdg5", name: "Gender Equality", icon: "/assets/sdg5.svg" },
  { id: "sdg6", name: "Clean Water and Sanitation", icon: "/assets/sdg6.svg" },
  { id: "sdg7", name: "Affordable and Clean Energy", icon: "/assets/sdg7.svg" },
  { id: "sdg8", name: "Decent Work and Economic Growth", icon: "/assets/sdg8.svg" },
  { id: "sdg9", name: "Industry, Innovation and Infrastructure", icon: "/assets/sdg9.svg" },
  { id: "sdg10", name: "Reduced Inequalities", icon: "/assets/sdg10.svg" },
  { id: "sdg11", name: "Sustainable Cities and Communities", icon: "/assets/sdg11.svg" },
  { id: "sdg12", name: "Responsible Consumption and Production", icon: "/assets/sdg12.svg" },
  { id: "sdg13", name: "Climate Action", icon: "/assets/sdg13.svg" },
  { id: "sdg14", name: "Life Below Water", icon: "/assets/sdg14.svg" },
  { id: "sdg15", name: "Life on Land", icon: "/assets/sdg15.svg" },
  { id: "sdg16", name: "Peace, Justice and Strong Institutions", icon: "/assets/sdg16.svg" },
  { id: "sdg17", name: "Partnerships for the Goals", icon: "/assets/sdg17.svg" },
];

export default function InspirationPage() {
  const [selectedSDG, setSelectedSDG] = useState<SDG | null>(null);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [sdgSectionCollapsed, setSdgSectionCollapsed] = useState(false);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSDGClick = async (sdg: SDG) => {
    setSelectedSDG(sdg);
    setSdgSectionCollapsed(true);
    setSummaries([]); // Clear previous summaries
    addSpanAttributes({
      'app.sdg.id': sdg.id,
      'app.sdg.name': sdg.name,
      'app.interaction': 'sdg_selection'
    });
    try {
      setLoading(true);
      // First API call
      const request1 = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sdg.id }),
      };
      console.debug('API Request (getTedTalks):', request1);
      const response1 = await fetch('/api/getTedTalks', request1);
      console.debug('API Response (getTedTalks) Status:', response1.status);
      const data1 = await response1.json();
      console.debug('API Response (getTedTalks) Data:', data1);

      // Use only the first TED talk from the response
      const firstTedTalk = data1[0];

      // Second API call using the first TED talk
      const request2 = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: firstTedTalk.transcript,
          sdg: firstTedTalk.sdg_tags[0],
        }),
      };
      console.debug('API Request (generateIdeas):', request2);
      const response2 = await fetch('/api/generateIdeas', request2);
      console.debug('API Response (generateIdeas) Status:', response2.status);
      const data2 = await response2.json();
      console.debug('API Response (generateIdeas) Data:', data2);

      setSummaries([
        {
          url: firstTedTalk.url,
          summary: data2.summary,
          idea: data2.idea,
          ideaTitle: data2.ideaTitle,
        },
      ]);
      addSpanAttributes({
        'app.ted_talk.url': firstTedTalk.url,
        'app.idea.generated': true
      });

      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const toggleSummary = (url: string) => {
    setExpandedSummary(expandedSummary === url ? null : url);
  };

  const handleEditIdea = (summary: Summary) => {
    setEditingIdea({
      idea: summary.idea,
      ideaTitle: summary.ideaTitle,
      url: summary.url,
    });
  };

  const handleConfirmIdea = async () => {
    if (!editingIdea) return;

    const newIdea: Idea = {
      ...editingIdea,
      sdg: selectedSDG ? `${selectedSDG.id}: ${selectedSDG.name}` : '',
    };

    // Save the idea to localStorage
    localStorage.setItem('selectedIdea', JSON.stringify(newIdea));

    // Add to Ideas in localStorage
    const existingIdeas = JSON.parse(localStorage.getItem('ideas') || '[]');
    const updatedIdeas = [...existingIdeas, newIdea];
    localStorage.setItem('ideas', JSON.stringify(updatedIdeas));

    addSpanAttributes({
      'app.idea.confirmed': true,
      'app.idea.title': newIdea.ideaTitle,
      'app.idea.sdg': newIdea.sdg || 'unknown',
      'app.interaction': 'idea_confirmation'
    });

    // get idea JSON
    const request3 = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idea: newIdea.idea,
        ideaTitle: newIdea.ideaTitle,
        sdg: newIdea.sdg,
      }),
    };
    console.debug('API Request (generateIdeaJSON):', request3);
    const response = await fetch('/api/generateIdeaJSON', request3);
    console.debug('API Response (generateIdeaJSON) Status:', response.status);
    const data = await response.json();
    console.debug('API Response (generateIdeaJSON) Data:', data);

    // Update selectedIdea in localStorage with the refined idea from the API
    if (data && data.idea) {
      const refinedIdea: Idea = {
        idea: data.idea.mission || data.idea.description || newIdea.idea, // Fallback to initial if missing
        ideaTitle: data.idea.name || newIdea.ideaTitle,
        sdg: newIdea.sdg,
        url: newIdea.url
      };
      localStorage.setItem('selectedIdea', JSON.stringify(refinedIdea));
    }

    // TODO --- send JSON to planning api endpoint
    // Use the data returned from generateIdeaJSON which contains the full structured idea
    const request4 = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data), // 'data' is the response from generateIdeaJSON
    };
    console.debug('API Request (business_plan_roadmap):', request4);
    try {
      const planningResponse = await fetch(
        `${process.env.INSPIRATION_PLANNING_FUNDING_API_BASE}/business_plan_roadmap`,
        request4
      );
      console.debug(
        'API Response (business_plan_roadmap) Status:',
        planningResponse.status
      );
      if (planningResponse.ok) {
        const planningData = await planningResponse.json();
        console.debug('API Response (business_plan_roadmap) Data:', planningData);
        localStorage.setItem('planningResults', JSON.stringify(planningData));
      } else {
        console.warn('Backend returned error status:', planningResponse.status);
      }
    } catch (error) {
      console.warn('Failed to fetch business plan roadmap from backend (is it running?):', error);
      // Fallback or proceed without planning results
    }

    // Navigate to the next page
    router.push('/generate/planning');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div
        className={`transition-all duration-300 ${sdgSectionCollapsed ? 'h-0 overflow-hidden' : 'h-auto'
          }`}
      >
        <h1 className="text-3xl font-bold mb-6">
          Choose an SDG for Inspiration
        </h1>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {SDGs.map((sdg) => (
            <button
              key={sdg.id}
              onClick={() => handleSDGClick(sdg)}
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Image src={sdg.icon} alt={sdg.name} width={80} height={80} />
            </button>
          ))}
        </div>
      </div>
      {selectedSDG && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">
              Selected SDG: {selectedSDG.name}
            </h2>
            <button
              onClick={() => setSdgSectionCollapsed(!sdgSectionCollapsed)}
              className="text-blue-600 hover:text-blue-800"
            >
              {sdgSectionCollapsed ? 'Change SDG' : 'Hide SDG Selection'}
            </button>
          </div>

          {summaries.length > 0 && (
            <>
              <h3 className="text-xl font-semibold mb-4">
                Inspired Ideas from TED Talks
              </h3>
              <div className="space-y-4">
                {summaries.map((sum) => (
                  <div key={sum.url} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSummary(sum.url)}
                      className="w-full flex justify-between items-center p-4 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <h4 className="text-lg font-medium">{sum.ideaTitle}</h4>
                      {expandedSummary === sum.url ? (
                        <ChevronUp />
                      ) : (
                        <ChevronDown />
                      )}
                    </button>
                    {expandedSummary === sum.url && (
                      <div className="p-4 space-y-3">
                        <p className="text-gray-700">
                          <strong>Summary:</strong> {sum.summary}
                        </p>
                        <p className="text-gray-700">
                          <strong>Idea:</strong> {sum.idea}
                        </p>
                        <div className="flex justify-between items-center">
                          <Link
                            href={sum.url}
                            className="text-blue-600 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Watch TED Talk
                          </Link>
                          <button
                            onClick={() => handleEditIdea(sum)}
                            className="flex items-center text-green-600 hover:text-green-700"
                          >
                            <Edit2 size={16} className="mr-1" /> Edit/Confirm
                            Idea
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          {loading && <p className="text-lg mt-4">Generating an idea...</p>}
        </div>
      )}
      {editingIdea && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-xl font-semibold mb-4">Edit Your Idea</h3>
            <input
              type="text"
              value={editingIdea.ideaTitle}
              onChange={(e) =>
                setEditingIdea({ ...editingIdea, ideaTitle: e.target.value })
              }
              className="w-full p-2 border rounded mb-4"
              placeholder="Idea Title"
            />
            <textarea
              value={editingIdea.idea}
              onChange={(e) =>
                setEditingIdea({ ...editingIdea, idea: e.target.value })
              }
              className="w-full h-40 p-2 border rounded mb-4"
              placeholder="Idea Description"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setEditingIdea(null)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmIdea}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
