var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var aiClient = null;
function getAiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "30mb" }));
  app.post("/api/summarize", async (req, res) => {
    try {
      const { description } = req.body;
      if (!description || typeof description !== "string" || !description.trim()) {
        return res.status(400).json({ error: "Description is required for summarization." });
      }
      const ai = getAiClient();
      const prompt = `Summarize the following task description into an extremely concise, short single sentence or single phrase (maximum 8-10 words) that can fit in a text input field as a brief summary notes. Keep it clear, action-oriented, and minimal. Do not use quotes, bold text, or introductory remarks. Just return the direct summary.

Description: ${description}`;
      const modelsToTry = ["gemini-3.7-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
      let summary = "";
      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt
          });
          summary = response.text?.trim() || "";
          if (summary) break;
        } catch (err) {
          console.warn(`Summarize failed with model ${model}:`, err?.message || err);
        }
      }
      if (!summary) {
        const cleaned = description.replace(/<[^>]*>/g, "").trim();
        const words = cleaned.split(/\s+/).slice(0, 10).join(" ");
        summary = words ? words.length < cleaned.length ? `${words}...` : words : description;
      }
      res.json({ summary });
    } catch (error) {
      console.error("Error summarizing description:", error);
      res.status(500).json({ error: error.message || "Failed to summarize description." });
    }
  });
  app.post("/api/voice-task/analyze-text", async (req, res) => {
    try {
      const { transcript, currentDate } = req.body;
      if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
        return res.status(400).json({ error: "Transcript is required." });
      }
      const ai = getAiClient();
      const todayRef = currentDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
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
            type: import_genai.Type.OBJECT,
            properties: {
              title: {
                type: import_genai.Type.STRING,
                description: "Concise actionable task title (3-8 words)."
              },
              description: {
                type: import_genai.Type.STRING,
                description: "The rest of the transcribed context, notes, requirements, or bullet points."
              },
              scheduledDate: {
                type: import_genai.Type.STRING,
                description: "Resolved date in YYYY-MM-DD format if mentioned, otherwise null or empty."
              }
            },
            required: ["title", "description"]
          }
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      res.json({
        title: parsed.title || transcript.slice(0, 50),
        description: parsed.description || "",
        scheduledDate: parsed.scheduledDate || null,
        rawTranscript: transcript
      });
    } catch (error) {
      console.error("Error analyzing voice task:", error);
      const raw = req.body?.transcript || "";
      const words = raw.trim().split(/\s+/);
      const title = words.slice(0, 6).join(" ");
      const description = words.length > 6 ? words.slice(6).join(" ") : "";
      res.json({
        title: title || "New Task",
        description: description || "",
        scheduledDate: null,
        rawTranscript: raw
      });
    }
  });
  app.post("/api/voice-task/transcribe-audio", async (req, res) => {
    try {
      const { audioBase64, mimeType = "audio/webm", currentDate } = req.body;
      if (!audioBase64 || typeof audioBase64 !== "string") {
        return res.status(400).json({ error: "audioBase64 is required." });
      }
      const ai = getAiClient();
      const todayRef = currentDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const audioPart = {
        inlineData: {
          mimeType: mimeType || "audio/webm",
          data: audioBase64
        }
      };
      let transcript = "";
      try {
        const transcribeResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: { parts: [audioPart, { text: "Transcribe the spoken audio verbatim in the original language. Return only the transcribed text." }] }
        });
        transcript = transcribeResponse.text?.trim() || "";
      } catch (transcribeErr) {
        console.warn("gemini-2.5-flash transcribe failed, trying gemini-3.7-flash:", transcribeErr?.message || transcribeErr);
        const fallbackTranscribe = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: { parts: [audioPart, { text: "Transcribe this audio. Return only the transcribed text." }] }
        });
        transcript = fallbackTranscribe.text?.trim() || "";
      }
      if (!transcript) {
        return res.status(422).json({ error: "Could not detect any speech in the audio." });
      }
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
            type: import_genai.Type.OBJECT,
            properties: {
              title: {
                type: import_genai.Type.STRING,
                description: "Concise actionable task title (3-8 words)."
              },
              description: {
                type: import_genai.Type.STRING,
                description: "The rest of the transcribed context, notes, requirements, or bullet points."
              },
              scheduledDate: {
                type: import_genai.Type.STRING,
                description: "Resolved date in YYYY-MM-DD format if mentioned, otherwise null or empty."
              }
            },
            required: ["title", "description"]
          }
        }
      });
      const parsed = JSON.parse(parseResponse.text || "{}");
      res.json({
        title: parsed.title || transcript.slice(0, 50),
        description: parsed.description || "",
        scheduledDate: parsed.scheduledDate || null,
        rawTranscript: transcript
      });
    } catch (error) {
      console.error("Error transcribing voice task audio:", error);
      res.status(500).json({ error: error.message || "Failed to process audio recording." });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
//# sourceMappingURL=server.cjs.map
