// File: src/app/page.tsx
'use client'
import { useEffect, useState } from 'react';
import Link from "next/link";
import { TrashIcon } from '@heroicons/react/24/solid';
import { addSpanAttributes } from '../lib/observability';

interface Idea {
  idea: string;
  ideaTitle: string;
  sdg?: string;
  url?: string;
}

export default function Home() {
  const [projects, setProjects] = useState<Idea[]>([]);

  useEffect(() => {
    const storedProjects = localStorage.getItem('ideas');
    if (storedProjects) {
      setProjects(JSON.parse(storedProjects));
      addSpanAttributes({
        'app.projects.count': JSON.parse(storedProjects).length,
        'app.page': 'home'
      });
    } else {
      addSpanAttributes({ 'app.projects.count': 0, 'app.page': 'home' });
    }
  }, []);

  const handleDeleteProject = (url: string) => {
    const updatedProjects = projects.filter((project) => project.url !== url);
    setProjects(updatedProjects);
    setProjects(updatedProjects);
    localStorage.setItem('ideas', JSON.stringify(updatedProjects));
    addSpanAttributes({
      'app.project.deleted': true,
      'app.project.deleted_url': url,
      'app.projects.remaining': updatedProjects.length
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-black bg-[url('/assets/SDGs-Colours.png')] bg-cover bg-center bg-no-repeat">
      {/* Header */}
      <header className="p-4 bg-red-600">
        <h1 className="text-2xl font-bold text-white">TEDxSDG</h1>
      </header>

      {/* Main content */}
      <main className="flex-grow flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl bg-white bg-opacity-90 p-8 rounded-lg">
          {projects.length > 0 ? (
            <>
              <h2 className="text-4xl font-bold mb-4 text-red-600">Your Projects</h2>
              <ul className="mb-8">
                {projects.map((project) => (
                  <li key={project.url} className="mb-2 flex items-center justify-between">
                    <Link
                      href={`/generate/planning`}
                      className="text-blue-600 hover:underline"
                      onClick={() => {
                        localStorage.setItem('selectedIdea', JSON.stringify(project));
                      }}
                    >
                      {project.ideaTitle}
                    </Link>
                    <button
                      onClick={() => handleDeleteProject(project.url!)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
              <Link
                href="/generate/inspiration"
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-300"
                onClick={() => localStorage.removeItem('selectedIdea')}
              >
                Start New Idea
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-4xl font-bold mb-4 text-red-600">Welcome to TEDxSDG</h2>
              <p className="text-xl mb-8">
                At TEDxSDG, we make turning your ideas into action seamless. Whether you&apos;re inspired by a specific SDG goal or have an idea of your own, our platform guides you through three key steps: Inspiration, Planning, and Funding.
              </p>
              <p className="text-xl mb-8">
                Start by submitting your idea or exploring SDG goals for inspiration. Our AI will then create a tailored business plan, complete with investor connections, a professional pitch deck, and grant proposal resources. Everything you need to bring your vision to life is just a few clicks away!
              </p>
              <p className="text-xl mb-8">
                Ready to create real-world change? TEDxSDG is here to guide you every step of the way.
              </p>
              <div className="text-center">
                <Link
                  href="/generate/inspiration"
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-300"
                >
                  Get Started
                </Link>
              </div>
              {/* <button
                onClick={() => {
                  const existingProjects = JSON.parse(localStorage.getItem('projects') || '[]');
                  const newProject = { id: Date.now(), name: 'New Project' };
                  const updatedProjects = [...existingProjects, newProject];
                  localStorage.setItem('projects', JSON.stringify(updatedProjects));
                  setProjects(updatedProjects)
                }}
                className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-300"
              >
                Add Test Project
              </button> */}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-white bg-black bg-opacity-80">
        © 2024 TEDxSDG. All rights reserved.
      </footer>
    </div>
  );
}
