
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { AspectRatio, ImageSize, StoryResult, StorySlide, StoryDraft } from "../types";

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
 * Generates an 'average looking' woman to serve as the persona if no image is uploaded.
 */
export const generateAveragePersona = async (): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-image-preview';
  
  const prompt = `Hyper-realistic candid photography. A hyper-realistic raw photo of a regular, average-looking 28-year-old woman looking into a bathroom mirror. 
  SHE IS NOT A MODEL. She has plain, ordinary features, realistic skin texture with visible pores and subtle imperfections, no makeup, and slightly messy hair.
  She is wearing an old, shapeless, dull grey t-shirt or pajamas. 
  Her expression is neutral and tired.
  captured on 35mm f/1.4 lens, delicate 35mm film grain, authentic natural colors, 8K resolution, photojournalistic style, no filters, no plastic-looking skin.
  Lighting is realistic indoor bathroom lighting, not studio lighting.
  Aesthetics: 5/10 or 6/10 in terms of looks. Authentic, everyday person.`;

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: "9:16", imageSize: "1K" } }
  });

  const candidate = response?.candidates?.[0];
  if (!candidate?.content?.parts) throw new Error("Persona generation failed.");

  for (const part of candidate.content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Persona generation failed.");
};

/**
 * PHASE 1: CREATE DRAFT (CASE STUDY EDITION)
 * Generates a 6-slide Professional Stylist Case Study.
 */
export const createStoryDraft = async (base64Image: string): Promise<StoryDraft> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-preview';
  
  // Define Persona: Professional Stylist / Agency
  const systemPrompt = `
    You are a Professional Personal Stylist and Image Consultant writing a case study about a client transformation.
    
    TONE: Professional, warm, analytical, and celebrating the client's beauty. Authority but empathy.
    PERSPECTIVE: Third-person ("She came to us...", "We noticed...", "The goal was...").
    LANGUAGE: English.
    
    INPUT IMAGE ANALYSIS:
    Look at the user's photo. Identify their age, hair color, and body type. 
    Give her a name (e.g., Sarah, Emma, Jessica, Clara).
    
    TASK: CREATE A 6-SLIDE NARRATIVE JSON.
    
    Slide 1: THE CLIENT INTRO.
    - Context: Mundane, everyday reality. She felt stuck or invisible.
    - Caption Example: "Sarah came to us because she felt her professional image didn't reflect her ambition..."
    
    Slide 2: THE PREFERENCE/ANALYSIS.
    - Context: Discussing her taste vs. reality.
    - Caption Example: "Although she loves earth tones, her current wardrobe was full of black and shapeless cuts..."
    
    Slide 3: THE HUNT (Strategy).
    - Context: The shopping process. Strategic selection.
    - Caption Example: "We focused our search on structured pieces that defined her silhouette without losing comfort."
    
    Slide 4: THE PROCESS (The Fitting).
    - Context: Trying things on. The chaos of the fitting room.
    - Caption Example: "The fitting is the moment of truth. We tested various fabrics until we found the perfect drape."
    
    Slide 5: THE RESULT (Look 1 - Professional/Chic).
    - Context: The immediate confidence boost.
    - Caption Example: "The result? A polished and secure image. This structured blazer completely changed her posture."
    
    Slide 6: THE LIFESTYLE (Look 2 - Social/Vibrant).
    - Context: Integrated into her life.
    - Caption Example: "Now Sarah has a functional wardrobe that works for her, not the other way around."

    OUTPUT JSON format:
    {
      "client_name": "Name",
      "outfit_before_desc": "Visual description of the messy/current look (e.g. oversized grey sweats, plain tee)",
      "outfit_after_1_desc": "Visual description of a chic, professional look (e.g. beige trench coat, white silk shirt)",
      "outfit_after_2_desc": "Visual description of a vibrant, social look (e.g. bold red dress, leather jacket)",
      "captions": ["Caption 1", "Caption 2", "Caption 3", "Caption 4", "Caption 5", "Caption 6"]
    }
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/png' } },
        { text: systemPrompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 8192
    }
  });

  // Safe Parsing
  let text = response.text || "{}";
  text = text.replace(/```json/g, '').replace(/```/g, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    text = text.substring(start, end + 1);
  }

  let parsedData: any = {};
  try {
    parsedData = JSON.parse(text);
  } catch (e) {
    console.warn("Draft JSON parse failed", e);
    throw new Error("Failed to generate story text. Please try again.");
  }

  // Fallback
  if (!parsedData.captions || parsedData.captions.length < 6) {
     parsedData.captions = Array(6).fill("Generating story...");
  }
  
  const outfitBefore = parsedData.outfit_before_desc || "plain oversized t-shirt and jeans";
  const outfitAfter1 = parsedData.outfit_after_1_desc || "chic beige blazer and white trousers";
  const outfitAfter2 = parsedData.outfit_after_2_desc || "elegant evening dress";

  // --- DOCUMENTARY VISUAL PROMPTS ---
  // Replaces the Chaos Generator with structured "Case Study" visuals.
  
  const techSpecs = "STYLE: Hyper-realistic photography, captured on 35mm f/1.4 lens, delicate 35mm film grain, medium depth of field, authentic natural colors, 8K resolution, photojournalistic style, no filters, no plastic-looking skin, natural skin texture with visible pores and subtle imperfections. CRITICAL: Keep exact face.";
  
  const visualPrompts = [
    // Slide 1: Mundane Intro (Neutral, everyday)
    `Hyper-realistic candid photography. Medium shot portrait of the woman standing in a normal living room or office. 
     OUTFIT: ${outfitBefore}. 
     POSE: Arms crossed or hands in pockets, neutral expression, looking at camera. 
     LIGHTING: Soft indoor window light. 
     VIBE: Real person, "Before" photo, authentic, slightly bored. ${techSpecs}`,

    // Slide 2: Analysis (Context)
    `Hyper-realistic candid photography. Candid shot of the woman sitting at a table with a coffee, looking thoughtful or looking at clothes on a bed. 
     OUTFIT: ${outfitBefore} (maybe with a cardigan). 
     POSE: Chin on hand, looking slightly away. 
     ENVIRONMENT: A cozy cafe or home bedroom. 
     VIBE: The brief, contemplating change, analyzing. ${techSpecs}`,

    // Slide 3: The Hunt (Shopping Action)
    `Hyper-realistic candid photography. Side-profile shot of the woman browsing through a clothing rack in a store. 
     ACTION: Hand touching fabric/hangers. Focused expression. 
     OUTFIT: ${outfitBefore}. 
     ENVIRONMENT: Clothing store with blurred background of clothes rails. 
     VIBE: Strategy, selection, "The Process". ${techSpecs}`,

    // Slide 4: The Fitting (Controlled Chaos)
    `Hyper-realistic candid photography. Mirror selfie OR Candid shot in a fitting room. 
     ACTION: Holding a new clothing item against her body to check (not wearing it fully yet), piles of rejected clothes on the bench behind. 
     OUTFIT: Basic tank top and jeans (neutral base). 
     VIBE: Experimentation, styling session, fitting room lighting. ${techSpecs}`,

    // Slide 5: Result A (The Win - Look 1)
    `Hyper-realistic candid photography. Portrait of the woman smiling confidently. 
     OUTFIT: ${outfitAfter1}. 
     POSE: Strong posture, hand on hip or holding bag. 
     ENVIRONMENT: Bright city street or stylish interior office. 
     LIGHTING: Great natural light (golden hour). 
     VIBE: Success, "The After", polished. ${techSpecs}`,

    // Slide 6: Result B (Lifestyle - Look 2)
    `Hyper-realistic candid photography. Candid lifestyle shot of the woman walking or laughing. 
     OUTFIT: ${outfitAfter2}. 
     ACTION: Walking towards camera or interacting with environment. 
     ENVIRONMENT: Outdoor urban setting, trendy district. 
     VIBE: Freedom, new styling integrated into life, happy. ${techSpecs}`
  ];

  const processedSlides = parsedData.captions.map((caption: string, i: number) => {
    // Map 6 slides to existing types for compatibility
    const typeMap = ['problem', 'belief', 'principle', 'process', 'result', 'insight'];
    return {
      type: typeMap[i] || 'result',
      caption,
      visualPrompt: visualPrompts[i]
    };
  });

  return {
    slides: processedSlides,
    storyData: {
      name: parsedData.client_name || "Client",
      styleType: "Stylist Case Study"
    }
  };
};

/**
 * PHASE 2: RENDER
 * Takes the approved draft and generates the images.
 */
export const renderStoryFromDraft = async (draft: StoryDraft, base64Image: string): Promise<StoryResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imageModel = 'gemini-3-pro-image-preview';
  const base64Data = base64Image.split(',')[1];
  const commonConfig = { imageConfig: { aspectRatio: "9:16" } };

  const generateSlideImage = (prompt: string) => {
    // Always use Ref Image
    const parts = [
       { inlineData: { data: base64Data, mimeType: 'image/png' } },
       { text: prompt }
    ];
    return ai.models.generateContent({
      model: imageModel,
      contents: { parts },
      config: commonConfig
    });
  };

  // Execute all image generations
  const promises = draft.slides.map(s => generateSlideImage(s.visualPrompt));
  const responses = await Promise.all(promises);

  const images = responses.map((res) => {
    const candidate = res?.candidates?.[0];
    if (!candidate?.content?.parts) return "";
    for (const part of candidate.content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return "";
  });

  if (images.some(img => !img)) throw new Error("Some images could not be generated. Please try again.");

  const slides: StorySlide[] = draft.slides.map((s, i) => {
    let textPos: StorySlide['textPosition'] = 'bottom';
    let badgePos: StorySlide['badgePosition'] = 'top-left';

    // Heuristics based on description keywords
    const desc = s.visualPrompt.toLowerCase();
    
    if (i === 3 || desc.includes("close up") || desc.includes("portrait") || desc.includes("reflection")) {
        textPos = 'top'; 
        badgePos = 'bottom-right';
    } else if (i === 2) {
       badgePos = 'top-right';
    }

    return {
      image: images[i],
      text: s.caption,
      type: s.type as any,
      textPosition: textPos,
      badgePosition: badgePos
    };
  });

  return {
    slides,
    storyData: draft.storyData
  };
};

// ... Keep existing editImageWithPrompt, generateImage, analyzeImage ...
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
