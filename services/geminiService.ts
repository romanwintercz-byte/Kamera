import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ExtractedData } from "../types";

const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

const analysisSchema: Schema = {
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
      description: "Datum uvedené v dokumentu (např. datum faktury, datum vydání) ve formátu RRRR-MM-DD. Pokud není nalezeno, použij dnešní.",
    },
    category: {
      type: Type.STRING,
      description: "Kategorie dokumentu (např. Faktura, Výkaz výměr, Smlouva, Inventární seznam).",
    },
    center: {
      type: Type.STRING,
      description: "Město nebo název střediska nalezený v hlavičce dokumentu. Hledej text 'Středisko' a extrahuj hodnotu pod ním nebo vedle něj (např. 'Teplice', 'Most', 'Praha'). Pokud není explicitně uvedeno, zkus ho odvodit z adresy. Pokud se nepodaří najít, uveď 'Neurčeno'.",
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Klíčová slova popisující dokument.",
    },
    tableHeaders: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Přesné názvy sloupců nalezené v hlavní tabulce dokumentu (např. ['Kód', 'Popis', 'Množství', 'Cena celkem']).",
    },
    tableRows: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          values: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Hodnoty v řádku seřazené přesně podle tableHeaders. Vše převedeno na text."
          }
        }
      },
      description: "Data jednotlivých řádků tabulky.",
    }
  },
  required: ["title", "summary", "category", "center", "tags", "tableHeaders", "tableRows"],
};

export const analyzePdfDocument = async (base64Pdf: string): Promise<ExtractedData> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your configuration.");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Pdf,
            },
          },
          {
            text: "Analyzuj tento PDF dokument. Najdi v hlavičce 'Středisko' (např. Teplice, Most) a ulož ho. Dále najdi hlavní tabulku s daty. Extrahuj názvy sloupců do 'tableHeaders' a obsah řádků do 'tableRows'. Každý sloupec v PDF musí odpovídat jedné hodnotě v poli 'values'.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text received from Gemini.");
    }

    const data = JSON.parse(text) as ExtractedData;
    return data;
  } catch (error) {
    console.error("Error analyzing PDF:", error);
    throw error;
  }
};
