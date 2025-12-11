import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ExtractedData } from "../types";

// Funkce pro bezpečné získání API klíče v různých prostředích (Vite, CRA, Node)
const getApiKey = (): string => {
  // 1. Standardní process.env (pokud je definován a nahrazen bundlerem)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  
  // 2. Podpora pro Vite (Vercel deployment často používá Vite)
  // Vite vyžaduje prefix VITE_ pro proměnné dostupné v prohlížeči
  try {
    // @ts-ignore - import.meta je validní ES syntaxe, ale TS může protestovat bez konfigurace
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      if (import.meta.env.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
      // @ts-ignore
      if (import.meta.env.API_KEY) return import.meta.env.API_KEY;
    }
  } catch (e) {
    // Ignorujeme chyby při přístupu k import.meta
  }

  return '';
};

const apiKey = getApiKey();

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
      description: "Hlavní datum reportu (YYYY-MM-DD). Pokud report obsahuje tabulku s daty prohlídek, použij nejčastější měsíc/rok z této tabulky. IGNORUJ datum tisku nebo stažení souboru.",
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
      description: "Přesné názvy sloupců nalezené v hlavní tabulce dokumentu. Příklad: ['Datum', 'Ulice', 'Druh závady', 'Stav'].",
    },
    tableRows: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          values: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Hodnoty v řádku. DŮLEŽITÉ: Pokud je ve sloupci datum, VŽDY ho převeď do formátu YYYY-MM-DD (např. 2023-10-15). Ostatní hodnoty nech jak jsou."
          }
        }
      },
      description: "Data jednotlivých řádků tabulky.",
    }
  },
  required: ["title", "summary", "category", "center", "tags", "tableHeaders", "tableRows"],
};

// Pomocná funkce pro čekání
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzePdfDocument = async (base64Pdf: string): Promise<ExtractedData> => {
  if (!apiKey) {
    throw new Error("API Key chybí. Ujistěte se, že máte nastavenou proměnnou prostředí VITE_API_KEY (nebo API_KEY) ve Vercel nastavení.");
  }

  const MAX_RETRIES = 3;
  let lastError: any;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
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
              text: "Analyzuj tento PDF dokument o kamerové prohlídce/inspekci. Extrahuj tabulku s daty. Je kriticky důležité, abys u každého řádku v tabulce správně identifikoval datum inspekce a naformátoval ho jako YYYY-MM-DD.",
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

    } catch (error: any) {
      console.warn(`Pokus ${attempt + 1} selhal:`, error);
      lastError = error;

      // Zkontrolujeme, zda jde o chybu přetížení (503) nebo nedostupnosti
      const isOverloaded = 
        error?.status === 503 || 
        error?.code === 503 || 
        (error?.message && (
          error.message.includes('503') || 
          error.message.includes('overloaded') || 
          error.message.includes('UNAVAILABLE')
        ));

      // Pokud je model přetížený a máme ještě pokusy, počkáme a zkusíme znovu
      if (isOverloaded && attempt < MAX_RETRIES - 1) {
        // Exponenciální backoff: 2s, 4s, 8s...
        const waitTime = 2000 * Math.pow(2, attempt);
        console.log(`Model je přetížený. Čekám ${waitTime}ms před dalším pokusem...`);
        await delay(waitTime);
        continue;
      }

      // Pokud to není chyba přetížení nebo došly pokusy, smyčku ukončíme (chyba se vyhodí níže)
      break;
    }
  }

  // Pokud se to nepovedlo ani po všech pokusech
  if (lastError?.status === 503 || lastError?.message?.includes('overloaded')) {
    throw new Error("Služba AI je momentálně extrémně vytížená. Zkuste to prosím za chvíli znovu.");
  }

  throw lastError || new Error("Nastala neznámá chyba při analýze dokumentu.");
};