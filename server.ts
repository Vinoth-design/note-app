import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazy-initialized GoogleGenAI client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    let key = process.env.GEMINI_API_KEY;
    if (!key) {
      try {
        const fs = require('fs');
        const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
        if (fs.existsSync(configPath)) {
          const raw = fs.readFileSync(configPath, 'utf8');
          const parsed = JSON.parse(raw);
          key = parsed.apiKey;
        }
      } catch (err) {
        // ignore
      }
    }
    if (!key) {
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support JSON payloads including base64 audio
  app.use(express.json({ limit: "30mb" }));

  // API Route for summarizing descriptions
  app.post("/api/summarize", async (req, res) => {
    try {
      const { description } = req.body;
      if (!description || typeof description !== "string" || !description.trim()) {
        return res.status(400).json({ error: "Description is required for summarization." });
      }

      const ai = getAiClient();
      let summary = "";

      if (ai) {
        const prompt = `Summarize the following task description into an extremely concise, short single sentence or single phrase (maximum 8-10 words) that can fit in a text input field as a brief summary notes. Keep it clear, action-oriented, and minimal. Do not use quotes, bold text, or introductory remarks. Just return the direct summary.\n\nDescription: ${description}`;

        const modelsToTry = ["gemini-3.7-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];

        for (const model of modelsToTry) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: prompt,
            });
            summary = response.text?.trim() || "";
            if (summary) break;
          } catch (err: any) {
            console.warn(`Summarize failed with model ${model}:`, err?.message || err);
          }
        }
      }

      // Graceful fallback if Gemini service is temporarily overloaded or key missing
      if (!summary) {
        const cleaned = description.replace(/<[^>]*>/g, '').trim();
        const words = cleaned.split(/\s+/).slice(0, 10).join(' ');
        summary = words ? (words.length < cleaned.length ? `${words}...` : words) : description;
      }

      res.json({ summary });
    } catch (error: any) {
      console.error("Error summarizing description:", error);
      res.status(500).json({ error: error.message || "Failed to summarize description." });
    }
  });

  // API Route for analyzing transcribed voice input into Task Name and Notes/Description
  app.post("/api/voice-task/analyze-text", async (req, res) => {
    try {
      const { transcript, currentDate } = req.body;
      if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
        return res.status(400).json({ error: "Transcript is required." });
      }

      const ai = getAiClient();
      const todayRef = currentDate || new Date().toISOString().split('T')[0];

      if (ai) {
        const systemInstruction = `You are an intelligent task parsing assistant. 
The user spoke a thought, task request, or meeting notes via voice speech-to-text.
Your goal is to extract:
1. "title": A concise, crisp, actionable Task Name (strictly 3 to 8 words maximum, e.g. "Prepare Q3 Marketing Pitch Deck", "Review Client Agreement", "Fix Login API Bug").
2. "description": The remaining context, background information, bullet points, specific requirements, or details mentioned in the transcript. If the user only spoke a single short phrase (e.g. "Buy milk"), the description can be empty or supplementary.
3. "scheduledDate": If the user explicitly stated a date or relative timeframe (e.g., "for tomorrow", "on Friday", "due next week", "August 30"), resolve it to YYYY-MM-DD relative to reference date ${todayRef}. If no specific date was mentioned, return null.

Return clean JSON matching the schema.`;

        const prompt = `User voice transcript: "${transcript}"`;

        const response = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: "Concise actionable task title (3-8 words).",
                },
                description: {
                  type: Type.STRING,
                  description: "The rest of the transcribed context, notes, requirements, or bullet points.",
                },
                scheduledDate: {
                  type: Type.STRING,
                  description: "Resolved date in YYYY-MM-DD format if mentioned, otherwise null or empty.",
                },
              },
              required: ["title", "description"],
            },
          },
        });

        const parsed = JSON.parse(response.text || "{}");
        return res.json({
          title: parsed.title || transcript.slice(0, 50),
          description: parsed.description || "",
          scheduledDate: parsed.scheduledDate || null,
          rawTranscript: transcript,
        });
      }

      // Fallback NLP extraction when AI client is not configured
      const words = transcript.trim().split(/\s+/);
      const title = words.slice(0, 6).join(" ");
      const description = words.length > 6 ? words.slice(6).join(" ") : "";
      return res.json({
        title: title || "New Task",
        description: description || "",
        scheduledDate: null,
        rawTranscript: transcript,
      });
    } catch (error: any) {
      console.error("Error analyzing voice task:", error);
      // Fallback extraction
      const raw = req.body?.transcript || "";
      const words = raw.trim().split(/\s+/);
      const title = words.slice(0, 6).join(" ");
      const description = words.length > 6 ? words.slice(6).join(" ") : "";
      res.json({
        title: title || "New Task",
        description: description || "",
        scheduledDate: null,
        rawTranscript: raw,
      });
    }
  });

  // API Route for transcribing recorded audio and analyzing into Task Name and Notes/Description
  app.post("/api/voice-task/transcribe-audio", async (req, res) => {
    try {
      const { audioBase64, mimeType = "audio/webm", currentDate } = req.body;
      if (!audioBase64 || typeof audioBase64 !== "string") {
        return res.status(400).json({ error: "audioBase64 is required." });
      }

      const ai = getAiClient();
      if (!ai) {
        return res.status(400).json({ error: "Gemini API Key is not configured on server. Please set GEMINI_API_KEY or enter your key in settings." });
      }
      const todayRef = currentDate || new Date().toISOString().split('T')[0];

      // 1. Transcribe audio using gemini-3.5-transcribe or gemini-3.7-flash
      const audioPart = {
        inlineData: {
          mimeType: mimeType || "audio/webm",
          data: audioBase64,
        },
      };

      let transcript = "";
      try {
        const transcribeResponse = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: { parts: [audioPart, { text: "Transcribe the spoken audio verbatim in the original language. Return only the transcribed text." }] },
        });
        transcript = transcribeResponse.text?.trim() || "";
      } catch (transcribeErr: any) {
        console.warn("gemini-2.5-flash transcribe failed, trying gemini-3.7-flash:", transcribeErr?.message || transcribeErr);
        const fallbackTranscribe = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: { parts: [audioPart, { text: "Transcribe this audio. Return only the transcribed text." }] },
        });
        transcript = fallbackTranscribe.text?.trim() || "";
      }

      if (!transcript) {
        return res.status(422).json({ error: "Could not detect any speech in the audio." });
      }

      // 2. Parse transcript into Title, Description, and Scheduled Date
      const systemInstruction = `You are an intelligent task parsing assistant. 
The user spoke a thought, task request, or meeting notes via voice speech-to-text.
Your goal is to extract:
1. "title": A concise, crisp, actionable Task Name (strictly 3 to 8 words maximum, e.g. "Prepare Q3 Marketing Pitch Deck", "Review Client Agreement", "Fix Login API Bug").
2. "description": The remaining context, background information, bullet points, specific requirements, or details mentioned in the transcript. If the user only spoke a single short phrase (e.g. "Buy milk"), the description can be empty or supplementary.
3. "scheduledDate": If the user explicitly stated a date or relative timeframe (e.g., "for tomorrow", "on Friday", "due next week", "August 30"), resolve it to YYYY-MM-DD relative to reference date ${todayRef}. If no specific date was mentioned, return null.

Return clean JSON matching the schema.`;

      const parseResponse = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: `User voice transcript: "${transcript}"`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "Concise actionable task title (3-8 words).",
              },
              description: {
                type: Type.STRING,
                description: "The rest of the transcribed context, notes, requirements, or bullet points.",
              },
              scheduledDate: {
                type: Type.STRING,
                description: "Resolved date in YYYY-MM-DD format if mentioned, otherwise null or empty.",
              },
            },
            required: ["title", "description"],
          },
        },
      });

      const parsed = JSON.parse(parseResponse.text || "{}");
      res.json({
        title: parsed.title || transcript.slice(0, 50),
        description: parsed.description || "",
        scheduledDate: parsed.scheduledDate || null,
        rawTranscript: transcript,
      });
    } catch (error: any) {
      console.error("Error transcribing voice task audio:", error);
      res.status(500).json({ error: error.message || "Failed to process audio recording." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Express v4 handles wildcard via '*'
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});

