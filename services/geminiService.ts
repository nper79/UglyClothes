
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
 * Generates the narrative text AND visual descriptions for the 8-slide stylist story.
 */
const generateStoryNarrative = async (ai: any): Promise<any> => {
  // Use Pro model for complex creative direction
  const model = 'gemini-3-pro-preview';
  
  const response = await ai.models.generateContent({
    model,
    contents: `You are an expert Personal Stylist and Creative Director creating a TikTok/Instagram story about a client's transformation.
    
    1. CREATE A PERSONA: Portuguese name (e.g., Joana, Sofia, Matilde).
    
    2. THE STORY FLOW (8 Slides):
       Slide 1 (Problem): Mirror selfie showing the struggle.
       Slide 2 (Belief): Close-up/Sad showing the wrong mindset.
       Slide 3 (Twist): Artistic portrait showing realization.
       Slide 4 (Principle): ACTION SHOT. Shopping, choosing fabrics, or browsing. NOT A SELFIE.
       Slide 5 (Process): Fitting room selfie, testing new things.
       Slide 6 (Result 1): Amazing outfit in a great location.
       Slide 7 (Result 2): Front camera selfie, happy.
       Slide 8 (Result 3): Full body mirror selfie, ready to go out.

    3. VISUAL RANDOMIZATION (CRITICAL):
       - Do NOT use the same bedroom background for every slide.
       - Vary locations: Living room, Hallway, Vintage Store, High-end Boutique, Street (Lisbon vibes), Cafe, Park.
       - Vary lighting: Golden hour, Window light, Indoor warm, Neon vibe.
       - Slide 4 MUST be a shopping/selection scene, but vary the setting (Vintage store, Mall, Boutique).

    4. OUTFITS:
       - Define 2 DISTINCT "Before" outfits. Both must be "dull", "ill-fitting" or "boring", but DIFFERENT from each other (e.g., Slide 1: Baggy Sweats; Slide 2: Old Oversized Pajamas).
       - Define 3 DISTINCT "After" outfits (e.g., Office Chic, Date Night, Weekend Cool).

    Output STRICTLY VALID JSON with this structure:
    {
      "name": "Client Name",
      "captions": ["Text for slide 1", ..., "Text for slide 8"],
      "visual_scenes": [
         "Description of visual for Slide 1 (Environment, Lighting, Pose)",
         "Description of visual for Slide 2",
         ... (8 total)
      ],
      "before_outfit_1_desc": "Visual description of Slide 1 outfit (Dull/Messy)",
      "before_outfit_2_desc": "Visual description of Slide 2 outfit (Dull/Messy - DIFFERENT from #1)",
      "after_outfit_1_desc": "Visual description...",
      "after_outfit_2_desc": "Visual description...",
      "after_outfit_3_desc": "Visual description..."
    }`,
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
      temperature: 0.8, // Higher temperature for CREATIVITY and VARIETY
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          captions: { type: Type.ARRAY, items: { type: Type.STRING } },
          visual_scenes: { type: Type.ARRAY, items: { type: Type.STRING } },
          before_outfit_1_desc: { type: Type.STRING },
          before_outfit_2_desc: { type: Type.STRING },
          after_outfit_1_desc: { type: Type.STRING },
          after_outfit_2_desc: { type: Type.STRING },
          after_outfit_3_desc: { type: Type.STRING }
        }
      }
    }
  });

  // Clean and parse JSON safely
  let text = response.text || "{}";
  text = text.replace(/```json/g, '').replace(/```/g, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    text = text.substring(start, end + 1);
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn("JSON parse failed, using fallback narrative.", e);
    return {
      name: "Ana",
      captions: [
        "Sentia-me sempre 'apagada' e sem estilo.",
        "Escondia-me em roupas largas e escuras.",
        "O problema não era o meu corpo, eram as escolhas.",
        "Descobrimos que a estrutura certa muda tudo.",
        "Testar novos cortes foi assustador mas vital.",
        "Agora olho para o espelho e sorrio.",
        "Não é vaidade, é amor próprio.",
        "Vamos descobrir a tua melhor versão? DM me."
      ],
      visual_scenes: [
        "Mirror selfie in a slightly messy hallway, dim lighting, looking down.",
        "Close up mirror selfie in a bathroom, harsh overhead light, looking tired.",
        "Artistic portrait, hand touching face, moody lighting.",
        "Candid shot from behind of woman browsing rails in a vintage clothing store.",
        "Mirror selfie in a bright department store fitting room, piles of clothes behind.",
        "Mirror selfie in a sunny living room, golden hour light hitting the face.",
        "Front facing camera selfie outdoors with a blurred street background.",
        "Full body mirror selfie in an elevator or modern lobby, confident pose."
      ],
      before_outfit_1_desc: "Baggy grey sweatpants and a faded black oversized t-shirt",
      before_outfit_2_desc: "Worn out navy blue pajamas with a loose cardigan",
      after_outfit_1_desc: "White linen blazer with high-waisted jeans",
      after_outfit_2_desc: "Floral midi dress with a denim jacket",
      after_outfit_3_desc: "All-black chic jumpsuit with statement belt"
    };
  }
};

export const generateStylistStory = async (base64Image: string): Promise<StoryResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imageModel = 'gemini-3-pro-image-preview';

  // 1. Generate the Text Narrative & Creative Direction
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

  // 2. Construct Dynamic Prompts
  const consistentPhone = "Black iPhone 15 Pro Max";
  const techSpecs = `STYLE: Ultra photorealistic, raw smartphone photo, authentic texture. Camera: iPhone Pro main sensor, f/1.8. NO text overlays, NO watermarks, NO camera app UI elements.`;

  // Fallbacks if AI misses a field
  const visuals = storyData.visual_scenes || [];
  const before1 = storyData.before_outfit_1_desc || "Casual grey sweats and tee";
  const before2 = storyData.before_outfit_2_desc || "Old oversized hoodie and leggings";
  const after1 = storyData.after_outfit_1_desc || "Chic blazer and jeans";
  const after2 = storyData.after_outfit_2_desc || "Elegant dress";
  const after3 = storyData.after_outfit_3_desc || "Stylish jumpsuit";

  const prompts = [
    // Slide 1: Problem (Mirror Selfie - Dynamic Loc - Outfit 1)
    `Mirror Selfie. Keep exact face of the woman in this photo.
     OUTFIT: ${before1}.
     SCENE DESCRIPTION: ${visuals[0] || "Bedroom, slightly messy, dim light"}.
     POSE: Standing stiffly, holding ${consistentPhone}, looking unsure.
     VIBE: Before transformation, low confidence. ${techSpecs}`,

    // Slide 2: Belief (Close Up - Dynamic Loc - Outfit 2)
    `Close-up Mirror Selfie (Waist up). Keep exact face.
     OUTFIT: ${before2} (MUST BE DIFFERENT from previous slide, but still dull/boring).
     SCENE DESCRIPTION: ${visuals[1] || "Bathroom mirror, harsh light"}.
     POSE: Holding ${consistentPhone} close to face/chest.
     VIBE: Tired, analyzing flaws. ${techSpecs}`,

    // Slide 3: Twist (Detail - Dynamic Loc)
    // FIX: Changed "Detail" to "Portrait" and added crop protection instructions
    `Artistic Portrait Reflection in a Mirror. Keep exact face.
     FRAMING: Head and shoulders shot. DO NOT CROP THE HEAD. Ensure headroom above the hair.
     FOCUS: Emotional expression, hand near face (optional).
     SCENE DESCRIPTION: ${visuals[2] || "Dim moody lighting, artistic shadow"}.
     COMPOSITION: Center the face in the upper 2/3 of the image. Leave negative space at the bottom for text.
     VIBE: Realization, intimacy. ${techSpecs}`,

    // Slide 4: Principle (Shopping/Browsing - CANDID - Dynamic Loc)
    `Candid photo of the woman shopping/browsing. Keep exact face.
     ACTION: Looking at clothes, fabrics, or holding a hanger. NOT A SELFIE.
     SCENE DESCRIPTION: ${visuals[3] || "Clothing store, browsing racks"}.
     ANGLE: Taken by a friend (side view or 3/4 view).
     VIBE: Discovery, process, shopping. ${techSpecs}`,

    // Slide 5: Process (Fitting Room - Dynamic Loc)
    `Mirror Selfie in a Fitting Room. Keep exact face.
     OUTFIT: Wearing parts of "${after1}" mixed with basics.
     SCENE DESCRIPTION: ${visuals[4] || "Department store fitting room, clothes on hook"}.
     POSE: Evaluating fit, holding ${consistentPhone}.
     VIBE: Trying things on, work in progress. ${techSpecs}`,

    // Slide 6: Result 1 (Mirror Selfie - Dynamic Loc)
    `Aesthetic Mirror Selfie. Keep exact face.
     OUTFIT: ${after1}.
     SCENE DESCRIPTION: ${visuals[5] || "Living room with sunlight"}.
     POSE: Confident outfit check, angled body, holding ${consistentPhone}.
     VIBE: Glow up, confident. ${techSpecs}`,

    // Slide 7: Result 2 (Front Camera - Dynamic Loc)
    `Front-facing Camera Selfie. Keep exact face.
     OUTFIT: ${after2}.
     SCENE DESCRIPTION: ${visuals[6] || "Outdoor street background, blurred"}.
     POSE: Looking at camera, genuine smile.
     VIBE: Happy, radiant. ${techSpecs}`,

    // Slide 8: Result 3 (Full Body - Dynamic Loc)
    `Full-body Mirror Selfie. Keep exact face.
     OUTFIT: ${after3}.
     SCENE DESCRIPTION: ${visuals[7] || "Elevator mirror or hotel lobby"}.
     POSE: Ready to leave, bag on shoulder, holding ${consistentPhone} confidently.
     VIBE: Complete transformation, powerful. ${techSpecs}`
  ];

  // 3. Execute Generations
  // All slides use ref image now for face consistency
  const promises = prompts.map((p) => generateSlideImage(p, true));
  
  const responses = await Promise.all(promises);

  // 4. Extract Images
  const images = responses.map((res, index) => {
    const candidate = res?.candidates?.[0];
    if (!candidate?.content?.parts) return "";
    for (const part of candidate.content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return "";
  });

  if (images.some(img => !img)) throw new Error("Some images could not be generated. Please try again.");

  // 5. Assemble Slides
  const slideTypes: StorySlide['type'][] = ['problem', 'belief', 'twist', 'principle', 'process', 'result', 'insight', 'cta'];
  const captions = Array.isArray(storyData.captions) ? storyData.captions : [];

  const slides: StorySlide[] = images.map((img, i) => {
    let textPos: StorySlide['textPosition'] = 'bottom';
    let badgePos: StorySlide['badgePosition'] = 'top-left';

    // Slide 3 usually needs top space for face, so text bottom
    // Slide 4 (Shopping) often looks better with Text Top if legs/clothes are at bottom
    if (i === 3) {
        textPos = 'top';
        badgePos = 'bottom-right';
    } else if (i === 2) {
      badgePos = 'top-right';
    }

    return {
      image: img,
      text: captions[i] || "",
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
