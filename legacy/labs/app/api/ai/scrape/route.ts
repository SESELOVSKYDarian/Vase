import { NextRequest, NextResponse } from 'next/server';

// Helper to clean HTML and extract text
function extractText(html: string): string {
    let text = html
        .replace(/<(script|style|iframe|noscript|svg|path|head|footer|nav)[\s\S]*?<\/\1>/gi, "") // Removed nav/footer to focus on content
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<[^>]+>/g, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
}

// Helper to extract internal links
function extractLinks(html: string, baseUrl: string): string[] {
    const links = new Set<string>();
    const regex = /href=["']([^"']+)["']/g;
    let match;
    const baseOrigin = new URL(baseUrl).origin;

    while ((match = regex.exec(html)) !== null) {
        try {
            const href = match[1];
            // Resolve relative URLs
            const absoluteUrl = new URL(href, baseUrl).href;

            // Only internal links, ignore anchors/hashes
            if (absoluteUrl.startsWith(baseOrigin) && !absoluteUrl.includes('#')) {
                links.add(absoluteUrl);
            }
        } catch {
            // Ignore invalid URLs
        }
    }
    return Array.from(links);
}

export async function POST(req: NextRequest) {
    // 30s timeout for deep scan
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 28000);

    try {
        const { url } = await req.json();

        if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

        console.log(`[Scrape] Starting Deep Scan for ${url}...`);

        const visited = new Set<string>();
        let combinedContent = "";

        // Queue for BFS: [URL, depth]
        const queue: { url: string; depth: number }[] = [{ url, depth: 0 }];
        const MAX_PAGES = 5; // Limit to prevent timeout
        let pagesScraped = 0;

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        };

        while (queue.length > 0 && pagesScraped < MAX_PAGES) {
            const current = queue.shift()!;
            if (visited.has(current.url)) continue;

            visited.add(current.url);
            console.log(`[Scrape] Fetching (${pagesScraped + 1}/${MAX_PAGES}): ${current.url}`);

            try {
                const response = await fetch(current.url, {
                    headers,
                    signal: controller.signal,
                    next: { revalidate: 3600 }
                });

                if (!response.ok) continue;

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('text/html')) continue;

                const html = await response.text();
                const text = extractText(html);

                if (text.length > 100) {
                    combinedContent += `\n\n--- PAGE: ${current.url} ---\n${text}`;
                    pagesScraped++;
                }

                // If at root level, add subpages to queue
                if (current.depth === 0) {
                    const links = extractLinks(html, current.url);
                    // Shuffle or just add first few to ensure variety? Just take first 10 distinct
                    for (const link of links.slice(0, 10)) {
                        if (!visited.has(link)) {
                            queue.push({ url: link, depth: 1 });
                        }
                    }
                }

            } catch (err) {
                console.error(`Failed to scrape ${current.url}:`, err);
            }
        }

        clearTimeout(timeoutId);

        if (combinedContent.length === 0) {
            throw new Error("Could not extract meaningful content from any page.");
        }

        // Final trimming
        const maxTotalLength = 80000; // Increased context window
        if (combinedContent.length > maxTotalLength) {
            combinedContent = combinedContent.substring(0, maxTotalLength) + '... (truncated)';
        }

        return NextResponse.json({
            success: true,
            content: combinedContent,
            pagesScanned: pagesScraped
        });

    } catch (error: any) {
        clearTimeout(timeoutId);
        console.error('Scraping error:', error);
        return NextResponse.json(
            { error: error.message || 'Error scraping website' },
            { status: 500 }
        );
    }
}
