import axios from 'axios';
import { NextResponse, NextRequest } from "next/server";
import { withSpan } from '@/lib/observability';

interface Talk {
    title: string; // Title of the TED Talk
    url: string; // URL of the TED Talk
    sdg_tags: string[]; // Tags related to Sustainable Development Goals (SDGs)
    presenterDisplayName: string; // Name of the presenter
    transcript: string; // Full transcript of the talk
}

interface ResultDocument {
    presenterDisplayName?: string | null;
    slug: string;
    sdg_tags?: string[] | null;
    transcript?: string | null;
}

interface Result {
    document: ResultDocument;
}

export async function POST(req: NextRequest) {
    return withSpan('api.getTedTalks', async (span) => {
        const query = await req.json();

        span.setAttributes({
            'app.request.query': query.text,
            'app.request.query_length': query.text?.length || 0,
        });

        const response = await withSpan('api.getTedTalks.search_backend', async (subSpan) => {
            subSpan.setAttribute('app.backend.url', 'tedxsdg-search-backend.vercel.app');
            const res = await axios.get(`https://tedxsdg-search-backend.vercel.app/api/search?query=${encodeURIComponent(query.text)}`);
            subSpan.setAttribute('app.backend.status', res.status);
            return res;
        });

        if (response.status !== 200) throw new Error(response.statusText);

        const data: Talk[] = response.data.results.map((result: Result) => ({
            presenterDisplayName: result.document.presenterDisplayName || '',
            title: result.document.slug.replace(/_/g, ' ') || '',
            url: `https://www.ted.com/talks/${result.document.slug}`,
            sdg_tags: result.document.sdg_tags || [],
            transcript: result.document.transcript || '',
        }));

        span.setAttribute('app.result.count', data.length);

        return NextResponse.json(data);
    });
}
