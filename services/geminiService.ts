import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData } from "../types";

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Hlavní nadpis nebo název dokumentu.",
    },
    summary: {
      type: Type.STRING,
      description: "Stručné shrnutí obsahu dokumentu v českém jazyce (max 2 věty).",
    },
    date: {
      type: Type.STRING,
      description: "Hlavní datum reportu (YYYY-MM-DD).",
    },
    category: {
      type: Type.STRING,
      description: "Kategorie dokumentu.",
    },
    center: {
      type: Type.STRING,
      description: "Název střediska.",
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Klíčová slova.",
    },
    tableHeaders: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Názvy sloupců.",
    },
    tableRows: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          values: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      },
      description: "Data řádků.",
    }
  },
  required: ["title", "summary", "category", "center", "tags", "tableHeaders", "tableRows"],
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzePdfDocument = async (base64Pdf: string): Promise<ExtractedData> => {
  // Inicializace až uvnitř funkce pro bezpečný přístup k API_KEY
  const apiKey = (window as any).process?.env?.API_KEY || "";
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-pro-preview";

  const MAX_RETRIES = 3;
  let lastError: any;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Pdf,
              },
            },
            {
              text: "Analyzuj tento PDF dokument. Extrahuj tabulku s daty a naformátuj všechna data jako YYYY-MM-DD.",
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
        },
      });

      const text = response.text;
      if (!text) throw new Error("Prázdná odpověď z AI.");
      return JSON.parse(text) as ExtractedData;

    } catch (error: any) {
      console.warn(`Pokus ${attempt + 1} selhal:`, error);
      lastError = error;
      if (attempt < MAX_RETRIES - 1) {
        await delay(2000 * Math.pow(2, attempt));
        continue;
      }
      break;
    }
  }

  throw lastError || new Error("Chyba při analýze dokumentu.");
};