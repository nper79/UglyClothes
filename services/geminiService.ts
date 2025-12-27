
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { AspectRatio, ImageSize, StoryResult, StorySlide } from "../types";

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
 * Generates the narrative text for the 8-slide stylist story.
 */
const generateStoryNarrative = async (ai: any): Promise<any> => {
  // Use Pro model for better JSON structure adherence and to avoid loops
  const model = 'gemini-3-pro-preview';
  
  const response = await ai.models.generateContent({
    model,
    contents: `You are an expert Personal Stylist creating a TikTok/Instagram story about a client's transformation.
    Create a fictional client persona (Portuguese name like Joana, Sofia, Maria).
    
    The story follows this exact 8-slide flow:
    1. Problem: The struggle (e.g., "Always felt invisible...").
    2. Wrong Belief: What she thought was wrong (e.g., "Thought I just needed more black clothes...").
    3. The Twist: The realization (e.g., "But it wasn't the color, it was the fit.").
    4. The Principle: The theory (e.g., "We focused on structure and fabrics.").
    5. The Process: Trying things on (e.g., "Testing new shapes...").
    6. The Result: The final look (e.g., "Finally feeling like myself.").
    7. Insight: A final thought (e.g., "Confidence is the best outfit.").
    8. CTA: Call to action (e.g., "Ready for your change? Link in bio.").

    CRITICAL INSTRUCTIONS:
    - Define 3 VISUALLY DISTINCT "AFTER" OUTFITS for slides 6, 7, and 8. 
    - KEEP CAPTIONS CONCISE (Max 15 words each).
    - KEEP DESCRIPTIONS CONCISE (Max 40 words each) to prevent generation errors.
    - Output STRICTLY VALID JSON.
    - Do NOT use markdown code blocks.

    Output JSON with the following structure:
    {
      "name": "Client Name",
      "captions": ["Caption 1", "Caption 2", "Caption 3", "Caption 4", "Caption 5", "Caption 6", "Caption 7", "Caption 8"],
      "before_outfit_desc": "Visual description of 'Before' outfit: Casual, comfortable but unstyled. MUST BE: A vintage Rock Band T-shirt, an oversized Adidas logo tee, or a graphic print shirt. Paired with ill-fitting jeans or sweatpants.",
      "after_outfit_1_desc": "Slide 6 Outfit: A specific distinct look (e.g. Tailored Trousers & Silk Blouse).",
      "after_outfit_2_desc": "Slide 7 Outfit: A completely different look (e.g. Midi Dress & Knit Cardigan).",
      "after_outfit_3_desc": "Slide 8 Outfit: Another different look (e.g. Statement Jacket, Jeans & Boots)."
    }`,
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 4096, // Reduced to prevent infinite text loops
      temperature: 0.4, // Lower temperature for more deterministic structure
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          captions: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          before_outfit_desc: { type: Type.STRING },
          after_outfit_1_desc: { type: Type.STRING },
          after_outfit_2_desc: { type: Type.STRING },
          after_outfit_3_desc: { type: Type.STRING }
        }
      }
    }
  });

  // Clean and parse JSON safely
  let text = response.text || "{}";
  
  // Remove markdown code blocks if present
  text = text.replace(/```json/g, '').replace(/```/g, '');
  
  // Robust extraction: find the first '{' and the last '}'
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  
  if (start !== -1 && end !== -1 && end > start) {
    text = text.substring(start, end + 1);
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn("JSON parse failed, using fallback narrative. Error:", e);
    // Return a rich fallback object so the user experience is NOT interrupted
    return {
      name: "Sofia",
      captions: [
        "Sempre me senti invisível com as minhas roupas.",
        "Achava que usar preto era a única solução.",
        "Mas percebi que o segredo não é a cor, é o corte.",
        "Focámos em estrutura e tecidos de qualidade.",
        "Experimentar novas formas mudou tudo.",
        "Finalmente sinto-me eu própria!",
        "A confiança é mesmo o melhor outfit.",
        "Pronta para a tua transformação? Link na bio."
      ],
      before_outfit_desc: "Oversized vintage Pink Floyd band t-shirt and grey baggy sweatpants",
      after_outfit_1_desc: "Chic beige trench coat over white tee and straight leg jeans",
      after_outfit_2_desc: "Emerald green midi silk slip dress with a blazer",
      after_outfit_3_desc: "Structured leather jacket with tailored black trousers"
    };
  }
};

export const generateStylistStory = async (base64Image: string): Promise<StoryResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imageModel = 'gemini-3-pro-image-preview';

  // 1. Generate the Text Narrative
  const storyData = await generateStoryNarrative(ai);
  const base64Data = base64Image.split(',')[1];
  const commonConfig = { imageConfig: { aspectRatio: "9:16" } };
  
  // Helper to create generation promise
  const generateSlideImage = (prompt: string, useRefImage: boolean = true) => {
    const parts: any[] = [{ text: prompt }];
    if (useRefImage) {
      parts.unshift({ inlineData: { data: base64Data, mimeType: 'image/png' } });
    }
    return ai.models.generateContent({
      model: imageModel,
      contents: { parts },
      config: commonConfig
    });
  };

  // 2. Define Prompts for 8 Slides
  // Safely access properties with defaults
  const beforeDesc = storyData.before_outfit_desc || "Oversized vintage band t-shirt and loose jeans";
  const afterDesc1 = storyData.after_outfit_1_desc || "Stylish tailored look";
  const afterDesc2 = storyData.after_outfit_2_desc || "Elegant chic look";
  const afterDesc3 = storyData.after_outfit_3_desc || "Bold statement look";
  
  // Safely access captions array
  const captions = Array.isArray(storyData.captions) ? storyData.captions : [];

  // CONSISTENCY: Use a standard black phone which is easiest for AI to replicate consistently
  const consistentPhone = "Black iPhone 15 Pro Max";

  // Shared technical specs
  const techSpecs = `STYLE: Ultra photorealistic, raw smartphone photo, authentic texture. Camera: iPhone Pro main sensor, f/1.8. NO text overlays, NO watermarks, NO camera app UI elements.`;

  const prompts = [
    // Slide 1: Problem (Before - Mirror Selfie - Bedroom)
    `Mirror Selfie. Keep exact face of the woman in this photo. OUTFIT: ${beforeDesc}. 
    POSE: Standing stiffly in front of a mirror, holding a ${consistentPhone}. 
    ENVIRONMENT: Bedroom with lived-in clutter (clothes on a chair, unmade bed) but clean walls and floor. NOT dirty/filthy.
    LIGHTING: Indoor bedroom lighting. 
    VIBE: "Before" photo, casual, slightly unstyled. ${techSpecs}`,

    // Slide 2: Wrong Belief (Before - Close Selfie - Bathroom)
    `Close-up Mirror Selfie (Waist up). Keep exact face. OUTFIT: ${beforeDesc}.
    POSE: Holding ${consistentPhone} closer to mirror, looking at screen.
    ENVIRONMENT: Home bathroom mirror. Tiled walls, domestic lighting, maybe a toothbrush holder or towels visible in background.
    LIGHTING: Overhead bathroom lighting (slightly harsh/yellow).
    VIBE: Tired, stuck. ${techSpecs}`,

    // Slide 3: Twist (Detail Selfie)
    // FIX: Ensure face is top half, empty space at bottom for text
    `Artistic Mirror Selfie Detail. Keep exact face.
    FOCUS: Close-up on eyes/face in the TOP HALF of the image. Hand touching face. ${consistentPhone} partially visible.
    COMPOSITION: Leave the bottom third of the image relatively empty/dark for text overlay.
    LIGHTING: Dim, moody, chiaroscuro.
    VIBE: Realization. ${techSpecs}`,

    // Slide 4: Principle (Shopping - Candid)
    `Candid medium shot of the woman browsing clothes in a clothing store. Keep exact face.
    ACTION: She is sorting through hangers on a rack, focused on fabrics.
    ANGLE: Slightly from the side/behind, as if taken by a friend accompanying her.
    ENVIRONMENT: Fashion store interior with blurred racks in background.
    VIBE: Casual shopping trip, searching for the new style. ${techSpecs}`,

    // Slide 5: Process (Fitting Room Selfie)
    `Mirror Selfie in a Fitting Room. Keep exact face.
    OUTFIT: Wearing elements of "${afterDesc1}" mixed with basic items (like a plain white tee).
    POSE: Evaluating the fit, holding ${consistentPhone}.
    ENVIRONMENT: Department store changing room.
    VIBE: Work in progress. ${techSpecs}`,

    // Slide 6: Result (After 1 - Golden Hour Selfie)
    `Aesthetic Mirror Selfie. Keep exact face. OUTFIT: ${afterDesc1} (DISTINCT LOOK 1).
    POSE: Confident "Outfit Check" pose, angled torso. Holding ${consistentPhone}.
    ENVIRONMENT: Clean, stylish bedroom.
    LIGHTING: Direct hard sunlight (Golden Hour), sun-drenched.
    VIBE: Glow up, radiant. ${techSpecs}`,

    // Slide 7: Insight (After 2 - Front Camera Selfie)
    `Front-facing Camera Selfie. Keep exact face. OUTFIT: ${afterDesc2} (DISTINCT LOOK 2).
    POSE: Looking directly at camera, genuine soft smile.
    BACKGROUND: Blurred simple background.
    LIGHTING: Soft flattering natural light.
    VIBE: Confidence, happiness. ${techSpecs}`,

    // Slide 8: CTA (After 3 - Dynamic Selfie)
    `Full-body Mirror Selfie (Final Look). Keep exact face. OUTFIT: ${afterDesc3} (DISTINCT LOOK 3).
    POSE: Ready to leave, bag on shoulder, holding ${consistentPhone} confidently.
    ENVIRONMENT: Near front door or elevator mirror.
    LIGHTING: bright and clean.
    VIBE: Action, ready for the world. ${techSpecs}`
  ];

  // 3. Execute Generations
  // All slides now feature the person, so we use the ref image for all.
  const promises = prompts.map((p) => generateSlideImage(p, true));
  
  const responses = await Promise.all(promises);

  // 4. Extract Images
  const images = responses.map((res, index) => {
    const candidate = res?.candidates?.[0];
    if (!candidate?.content?.parts) {
      console.warn(`Slide ${index + 1} generation missing candidates.`);
      return "";
    }
    for (const part of candidate.content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return "";
  });

  if (images.some(img => !img)) throw new Error("Some images could not be generated (Safety/Filter block). Please try again with a clearer photo.");

  // 5. Assemble Slides
  const slideTypes: StorySlide['type'][] = ['problem', 'belief', 'twist', 'principle', 'process', 'result', 'insight', 'cta'];
  
  // STRATEGY: 
  // Text Bottom -> Badge Top Left (Safest for selfies where face is center-top)
  
  const slides: StorySlide[] = images.map((img, i) => {
    let textPos: StorySlide['textPosition'] = 'bottom';
    let badgePos: StorySlide['badgePosition'] = 'top-left';

    // Slide 3 (Twist/Detail) - User requested Text Bottom. 
    // Image prompt was adjusted to keep face in top half.
    if (i === 2) {
      textPos = 'bottom'; 
      badgePos = 'top-right';
    }

    // Fallback to empty string or generic text if caption missing
    const captionText = captions[i] || "";

    return {
      image: img,
      text: captionText,
      type: slideTypes[i],
      textPosition: textPos,
      badgePosition: badgePos
    };
  });

  return {
    slides,
    storyData: {
      name: storyData.name || "Client",
      styleType: "Transformation"
    }
  };
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
  
  const candidate = response?.candidates?.[0];
  if (!candidate?.content?.parts) throw new Error("Edit generation failed or blocked.");

  for (const part of candidate.content.parts) {
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

  const candidate = response?.candidates?.[0];
  if (!candidate?.content?.parts) throw new Error("Image generation failed or blocked.");

  for (const part of candidate.content.parts) {
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
