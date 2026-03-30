// pages/api/search.js
// Server-side API route - Anthropic API key stays in Vercel env vars

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const { type, query, systemPrompt } = req.body;

  if (!query || !systemPrompt) {
    return res.status(400).json({ error: "Missing query or systemPrompt" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: query,
          },
        ],
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return res.status(response.status).json({ error: "API request failed", detail: errText });
    }

    const data = await response.json();

    // Extract text content from response
    const textBlocks = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    return res.status(200).json({ text: textBlocks });
  } catch (err) {
    console.error("Search API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
