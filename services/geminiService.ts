
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { AspectRatio, ImageSize, DualResult } from "../types";

export const checkApiKey = async (): Promise<boolean> => {
  if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
    return await window.aistudio.hasSelectedApiKey();
  }
  return !!process.env.API_KEY;
};

export const openApiKeySelection = async (): Promise<void> => {
  if (typeof window.aistudio?.openSelectKey === 'function') {
    await window.aistudio.openSelectKey();
  }
};

/**
 * Generates a description of a clean but unflattering/tasteless outfit.
 * Focuses on bad fashion choices rather than dirtiness.
 */
const generateCasualStylePrompt = async (ai: any): Promise<string> => {
  const textModel = 'gemini-3-flash-preview';
  const response = await ai.models.generateContent({
    model: textModel,
    contents: "Gere uma descrição curta e visual (em inglês) para um gerador de imagens. O objetivo é descrever uma mulher vestindo roupas normais, LIMPAS e decentes, mas que NÃO a favorecem (estilo 'unflattering' ou 'frumpy'). \n\nREGRAS RÍGIDAS:\n1. AS ROUPAS TÊM DE ESTAR LIMPAS. Zero sujidade, zero rasgões.\n2. O 'fail' está no estilo e no corte: roupas largas demais, padrões antigos (ex: flores de sofá), cores bege/cinza aborrecidas, malhas grossas que escondem a forma.\n3. Exemplo: Jeans de cintura subida mal cortados (mom jeans largos), uma t-shirt de publicidade antiga ou uma camisola de lã de uma tia avó.\n4. O calçado deve ser prático e feio (ex: ténis ortopédicos ou pantufas de casa).\n5. Cenário: Uma sala de estar normal ou uma cozinha com luz fluorescente.",
  });
  return response.text || "wearing clean but ill-fitting high-waisted baggy jeans and a shapeless, dated beige knit sweater with plain white sneakers.";
};

export const generateDualLook = async (base64Image: string): Promise<DualResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imageModel = 'gemini-3-pro-image-preview';
  
  // Step 1: Swap person but keep original outfit (Studio Look)
  const response1 = await ai.models.generateContent({
    model: imageModel,
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image.split(',')[1],
            mimeType: 'image/png'
          }
        },
        {
          text: "Change the person in this photo to a completely different woman with unique facial features, but strictly preserve the exact clothing she is wearing (color, fabric, fit, patterns). Maintain the background and pose exactly as in the original."
        }
      ]
    }
  });

  let studioImg = "";
  for (const part of response1.candidates[0].content.parts) {
    if (part.inlineData) {
      studioImg = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }

  if (!studioImg) throw new Error("Failed to generate the Studio Look.");

  // Step 2: Intermediate Step - Generate a textual description of a clean but tasteless outfit
  const casualOutfitDescription = await generateCasualStylePrompt(ai);

  // Step 3: Keep the SAME person but apply the generated unflattering prompt
  const response2 = await ai.models.generateContent({
    model: imageModel,
    contents: {
      parts: [
        {
          inlineData: {
            data: studioImg.split(',')[1],
            mimeType: 'image/png'
          }
        },
        {
          text: `Keep the exact same woman from this image (same face and hair color), but change her outfit and environment based on this description: ${casualOutfitDescription}. 
          
          CRITICAL FORMATTING:
          - GENERATE A SINGLE IMAGE ONLY. DO NOT CREATE A GRID, SPLIT SCREEN, OR COLLAGE.
          
          AESTHETIC INSTRUCTIONS:
          1. CLEANLINESS: The clothes and person must be perfectly CLEAN. No dirt, no grime, no stains.
          2. STYLE: 'Frumpy' and 'Dated'. Think 'Thrift Store' finds that fit poorly. Baggy, shapeless, boring colors.
          3. PHOTOGRAPHY: Amateur snapshot style. Use direct flash or flat overhead lighting to make it look like a normal phone photo, removing all 'glamour'.
          4. POSE: Standing or sitting awkwardly, looking bored or tired.
          5. VIBE: Pure reality. Boring, mundane, everyday life without filters.`
        }
      ]
    }
  });

  let casualImg = "";
  for (const part of response2.candidates[0].content.parts) {
    if (part.inlineData) {
      casualImg = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }

  if (!casualImg) throw new Error("Failed to generate the Casual Look.");

  return { studio: studioImg, casual: casualImg };
};

export const editImageWithPrompt = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-flash-image';
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/png' } },
        { text: prompt }
      ]
    }
  });
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("No edited image generated.");
};

export const generateImage = async (prompt: string, size: ImageSize, ar: AspectRatio): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-image-preview';
  const response = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: ar as any, imageSize: size as any } }
  });
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Image generation failed.");
};

export const analyzeImage = async (base64Image: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-preview';
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/png' } },
        { text: "Analyze this image in detail. Identify the person and their outfit." }
      ]
    }
  });
  return response.text || "No analysis could be generated.";
};
