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
 * Generates an 'average looking' woman to serve as the persona if no image is uploaded.
 */
export const generateAveragePersona = async (): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-image-preview';
  
  // Specific prompt for "average looks", 5-6/10, realistic, not a supermodel
  const prompt = `A hyper-realistic raw smartphone photo of a regular, average-looking 28-year-old woman looking into a bathroom mirror. 
  SHE IS NOT A MODEL. She has plain, ordinary features, realistic skin texture with slight imperfections/pores, no makeup, and slightly messy hair.
  She is wearing an old, shapeless, dull grey t-shirt or pajamas. 
  Her expression is neutral and tired.
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
 * Generates the narrative text AND visual descriptions for the 8-slide stylist story.
 */
const generateStoryNarrative = async (ai: any): Promise<any> => {
  // Use Pro model for complex creative direction
  const model = 'gemini-3-pro-preview';
  
  const response = await ai.models.generateContent({
    model,
    contents: `You are an expert Personal Stylist and Creative Director creating a TikTok/Instagram story about a client's transformation.
    
    1. LANGUAGE: ENGLISH ONLY. All captions must be in English.
    2. CREATE A PERSONA: Name (e.g., Sarah, Emma, Mia).
    
    3. THE STORY FLOW (8 Slides):
       Slide 1 (Problem): Mirror selfie showing the struggle.
       Slide 2 (Belief): Close-up/Sad showing the wrong mindset.
       Slide 3 (Twist): Direct portrait showing realization.
       Slide 4 (Principle): ACTION SHOT. Shopping, choosing fabrics, or browsing. NOT A SELFIE.
       Slide 5 (Process): Fitting room selfie, testing new things.
       Slide 6 (Result 1): Amazing outfit in a great location.
       Slide 7 (Result 2): Front camera selfie, happy.
       Slide 8 (Result 3): Full body mirror selfie. CAPTION MUST BE: "Self love is to strive for the best version of yourself."

    4. VISUAL RANDOMIZATION (CRITICAL):
       - Do NOT use the same bedroom background for every slide.
       - Vary locations: Living room, Hallway, Vintage Store, High-end Boutique, Street, Cafe, Park.
       - Slide 4 MUST be a shopping/selection scene.

    5. OUTFITS:
       - Define 2 DISTINCT "Before" outfits. Both must be "dull", "ill-fitting" or "boring", but DIFFERENT from each other.
       - Define 3 DISTINCT "After" outfits.

    Output STRICTLY VALID JSON with this structure:
    {
      "name": "Client Name",
      "captions": ["English Caption 1", ..., "English Caption 8"],
      "visual_scenes": [
         "Description of visual for Slide 1 (Environment, Lighting, Pose)",
         ... (8 total)
      ],
      "before_outfit_1_desc": "Visual description...",
      "before_outfit_2_desc": "Visual description...",
      "after_outfit_1_desc": "Visual description...",
      "after_outfit_2_desc": "Visual description...",
      "after_outfit_3_desc": "Visual description..."
    }`,
    config: {
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
      temperature: 0.8,
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

  let parsedData;
  try {
    parsedData = JSON.parse(text);
  } catch (e) {
    console.warn("JSON parse failed, using fallback narrative.", e);
    parsedData = {
      name: "Emma",
      captions: [
        "I always felt invisible in my clothes.",
        "I hid in baggy, dark outfits.",
        "The problem wasn't my body, it was my choices.",
        "We discovered that structure changes everything.",
        "Testing new cuts was scary but necessary.",
        "Now I look in the mirror and smile.",
        "It's not vanity, it's self-love.",
        "Self love is to strive for the best version of yourself."
      ],
      visual_scenes: [
        "Mirror selfie in a slightly messy hallway, dim lighting, looking down.",
        "Close up mirror selfie in a bathroom, harsh overhead light, looking tired.",
        "Direct portrait, soft lighting, hand touching face.",
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

  // FORCE FINAL CAPTION
  if (parsedData.captions && Array.isArray(parsedData.captions)) {
    if (parsedData.captions.length < 8) {
        // Fill missing captions if generator failed
        const fillers = ["Change is possible.", "Trust the process.", "New look, new me.", "Confidence unlocked."];
        while (parsedData.captions.length < 7) {
            parsedData.captions.push(fillers[parsedData.captions.length % fillers.length]);
        }
    }
    // Hard override for the last slide
    parsedData.captions[7] = "Self love is to strive for the best version of yourself.";
  }

  return parsedData;
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
  // FIX: Simplified phone description to avoid hallucinations and ensure consistency
  const consistentPhone = "a sleek black smartphone"; 
  const techSpecs = `STYLE: Ultra photorealistic, raw smartphone photo, authentic texture. 
  CRITICAL: The woman MUST be holding ${consistentPhone} in all mirror selfies. 
  NO text overlays, NO watermarks, NO camera app UI elements. 
  Keep exact face of the woman in the reference photo.`;

  // Variables mapped from Story Data
  const visuals = storyData.visual_scenes || [];
  const before1 = storyData.before_outfit_1_desc || "Casual grey sweats and tee";
  const before2 = storyData.before_outfit_2_desc || "Old oversized hoodie and leggings";
  const after1 = storyData.after_outfit_1_desc || "Chic blazer and jeans";
  const after2 = storyData.after_outfit_2_desc || "Elegant dress";
  const after3 = storyData.after_outfit_3_desc || "Stylish jumpsuit";

  // --- STORY ARCS ---

  // Arc 1: Standard Transformation (Original Logic)
  const arcStandard = [
    // Slide 1: Problem
    `Mirror Selfie. OUTFIT: ${before1}. SCENE: ${visuals[0] || "Bedroom, messy"}. POSE: Standing stiffly, holding ${consistentPhone} with both hands, looking unsure. VIBE: Low confidence. ${techSpecs}`,
    // Slide 2: Belief
    `Close-up Mirror Selfie (Waist up). OUTFIT: ${before2}. SCENE: ${visuals[1] || "Bathroom, harsh light"}. POSE: Holding ${consistentPhone} close to face, blocking part of chest. VIBE: Tired, analyzing flaws. ${techSpecs}`,
    // Slide 3: Twist (Clean Portrait)
    `Cinematic Close-up Portrait in a Mirror. COMPOSITION: Straight-on angle. Direct eye contact with reflection. NO SIDE MIRRORS. NO MULTIPLE REFLECTIONS. Head and shoulders only. SCENE: ${visuals[2] || "Dim lighting"}. VIBE: Realization. ${techSpecs}`,
    // Slide 4: Principle (Shopping)
    `Candid photo of the woman shopping. ACTION: Looking at clothes on rack. NOT A SELFIE. ANGLE: Side view. SCENE: ${visuals[3] || "Clothing store"}. VIBE: Discovery. ${techSpecs}`,
    // Slide 5: Process (Fitting Room)
    `Mirror Selfie in Fitting Room. OUTFIT: Wearing parts of "${after1}". SCENE: ${visuals[4] || "Department store fitting room"}. POSE: Evaluating fit, holding ${consistentPhone}. VIBE: Work in progress. ${techSpecs}`,
    // Slide 6: Result 1
    `Aesthetic Mirror Selfie. OUTFIT: ${after1}. SCENE: ${visuals[5] || "Living room"}. POSE: Confident outfit check, holding ${consistentPhone}. VIBE: Glow up. ${techSpecs}`,
    // Slide 7: Result 2
    `Front-facing Camera Selfie. OUTFIT: ${after2}. SCENE: ${visuals[6] || "Outdoor street"}. POSE: Genuine smile, holding ${consistentPhone} slightly above. VIBE: Radiant. ${techSpecs}`,
    // Slide 8: Result 3
    `Full-body Mirror Selfie. OUTFIT: ${after3}. SCENE: ${visuals[7] || "Elevator"}. POSE: Ready to leave, holding ${consistentPhone}. VIBE: Powerful. ${techSpecs}`
  ];

  // Arc 2: The Day Out (Lifestyle/Street focus)
  const arcDayOut = [
    // Slide 1
    `Candid shot waiting at a bus stop or sitting on a park bench. OUTFIT: ${before1}. POSE: Hunching over, arms crossed as if cold or insecure, looking down. ENVIRONMENT: City street, overcast weather. LIGHTING: Diffused, flat outdoor light. VIBE: "Before", cold, blending into background. ${techSpecs}`,
    // Slide 2
    `Reflection in a shop window. OUTFIT: ${before1}. POSE: Looking at own reflection critically, touching hair or clothes. ENVIRONMENT: City storefront glass, reflection of busy street behind. VIBE: Realization. ${techSpecs}`,
    // Slide 3
    `Close up shot at a cafe table. FOCUS: Face resting on hand, looking contemplative. ${consistentPhone} visible on table. COMPOSITION: Bottom half blurry (coffee cup, table surface) for text space. LIGHTING: Window light from side. VIBE: Planning the change. ${techSpecs}`,
    // Slide 4
    `Medium shot browsing a clothing rack in a boutique. ACTION: Hand on a hanger, examining a texture. ANGLE: From the side. ENVIRONMENT: Stylish boutique. VIBE: Curation, quality. ${techSpecs}`,
    // Slide 5
    `Mirror Selfie in a street convex mirror or large glass window. OUTFIT: Wearing "${after1}" but with a backpack or bag. POSE: Taking a quick photo while walking with ${consistentPhone}. ENVIRONMENT: Urban street corner. VIBE: Testing the new look. ${techSpecs}`,
    // Slide 6
    `Street Style photography shot. OUTFIT: ${after1}. POSE: Walking confidently towards camera, hair moving slightly. ENVIRONMENT: City crossing or sidewalk. LIGHTING: Golden hour backlight. VIBE: Influencer street style. ${techSpecs}`,
    // Slide 7
    `Candid shot laughing at a cafe terrace. OUTFIT: ${after2}. POSE: Sitting relaxed, holding a drink, looking away or at a friend. BACKGROUND: Blurry cafe patrons. VIBE: Social confidence. ${techSpecs}`,
    // Slide 8
    `Elevator Mirror Selfie. OUTFIT: ${after3}. POSE: "Fit check" in the metal reflection, sleek and modern, holding ${consistentPhone}. ENVIRONMENT: Modern elevator or chrome lobby. VIBE: Going up, leveling up. ${techSpecs}`
  ];

  // Arc 3: The Closet Cleanout (Home/Organization focus)
  const arcCloset = [
    // Slide 1
    `High angle shot standing amidst a pile of clothes on the floor. OUTFIT: ${before1}. POSE: Hands on hips or head, looking overwhelmed at the mess. ENVIRONMENT: Bedroom floor covered in clothing piles. LIGHTING: Indoor artificial light. VIBE: Overwhelmed, clutter. ${techSpecs}`,
    // Slide 2
    `Sitting on the floor selfie. OUTFIT: ${before1}. POSE: Legs crossed, holding ${consistentPhone} low, looking tired. ENVIRONMENT: Against the bed or wall, surrounded by messy clothes. LIGHTING: Dim lamp light. VIBE: Defeated. ${techSpecs}`,
    // Slide 3
    `Close up of holding a specific fabric against face. FOCUS: Eyes looking at the fabric/color. COMPOSITION: Bottom half is the fabric texture (blur/solid) for text. LIGHTING: Soft window light highlighting skin tone. VIBE: Discovery, color analysis. ${techSpecs}`,
    // Slide 4
    `Standing next to a clean, minimal clothing rack. ACTION: Placing a hanger on the rack decisively. ENVIRONMENT: Clean bedroom wall, minimal furniture. VIBE: Organization, capsule wardrobe. ${techSpecs}`,
    // Slide 5
    `Full body mirror selfie in bedroom. OUTFIT: Styling "${after1}" (tucking in shirt or rolling sleeves). POSE: Mid-action of adjusting the outfit, holding ${consistentPhone}. ENVIRONMENT: Tidy bedroom (contrast to slide 1). VIBE: Experimenting. ${techSpecs}`,
    // Slide 6
    `Tripod shot (self-timer style) in Living Room. OUTFIT: ${after1}. POSE: Sitting on a sofa or chair, looking elegant and relaxed. ${consistentPhone} is visible on a table nearby. ENVIRONMENT: Clean living room, nice decor. LIGHTING: Bright afternoon window light. VIBE: "Clean girl" aesthetic. ${techSpecs}`,
    // Slide 7
    `Mirror selfie focusing on accessories. OUTFIT: ${after2}. POSE: Hand near face showing rings/watch/bag, confident smirk, holding ${consistentPhone}. BACKGROUND: Simple wall. VIBE: Details matter, sophistication. ${techSpecs}`,
    // Slide 8
    `Leaving the house selfie. OUTFIT: ${after3}. POSE: Hand on doorknob, looking back at mirror, smiling, holding ${consistentPhone}. ENVIRONMENT: Hallway, coat rack. LIGHTING: Natural light from open door. VIBE: Done, refreshed. ${techSpecs}`
  ];

  // Arc 4: The Event Prep (Urgency/Glamour focus)
  const arcEvent = [
    // Slide 1
    `Bathroom Mirror Selfie with towel on head. OUTFIT: ${before1} (bathrobe or old tee). POSE: Wide eyes, looking stressed at reflection, holding ${consistentPhone}. ENVIRONMENT: Steamy bathroom. LIGHTING: Harsh vanity light. VIBE: Panic, running late. ${techSpecs}`,
    // Slide 2
    `Mirror selfie holding up a boring hanger against body. OUTFIT: ${before1}. POSE: Frowning, holding a dull grey/black dress on a hanger in front of body. ENVIRONMENT: Bedroom. VIBE: Boring, safe, uninspired. ${techSpecs}`,
    // Slide 3
    `Applying lipstick/makeup in a compact mirror. FOCUS: Face close up, eyes sharp. COMPOSITION: Bottom dark/blurred for text. LIGHTING: Ring light style reflection in eyes. VIBE: Taking control, getting ready. ${techSpecs}`,
    // Slide 4
    `Low angle shot (from floor mirror) showing shoes and hem of pants. Keep exact face visible at top. ACTION: Putting on a nice shoe. ENVIRONMENT: Bedroom floor. VIBE: Building the foundation. ${techSpecs}`,
    // Slide 5
    `Close up mirror selfie adjusting a necklace or collar. OUTFIT: "${after1}". POSE: Fixing the details, focused expression. ENVIRONMENT: Hallway mirror. VIBE: Polishing the look. ${techSpecs}`,
    // Slide 6
    `Flash photography style shot. OUTFIT: ${after1}. POSE: Leaning against a wall, looking cool. ENVIRONMENT: Darker background (restaurant or evening street). LIGHTING: Direct flash, high contrast. VIBE: Cool girl, night out. ${techSpecs}`,
    // Slide 7
    `Seated dinner shot (POV of date). OUTFIT: ${after2}. POSE: Smiling naturally across a table. ${consistentPhone} on the table. BACKGROUND: Restaurant bokeh. LIGHTING: Candlelight or warm ambient. VIBE: Romance, success. ${techSpecs}`,
    // Slide 8
    `Fancy Restroom Mirror Selfie. OUTFIT: ${after3}. POSE: Confident check in a large fancy mirror, holding ${consistentPhone}. ENVIRONMENT: Upscale hotel or restaurant restroom. LIGHTING: Flattering warm light. VIBE: Final confirmation. ${techSpecs}`
  ];

  // 3. Select Random Story Arc
  const storyArcs = [arcStandard, arcDayOut, arcCloset, arcEvent];
  const selectedPrompts = storyArcs[Math.floor(Math.random() * storyArcs.length)];

  console.log("Generating Story Arc Index:", storyArcs.indexOf(selectedPrompts));

  // 4. Execute Generations
  // All slides use ref image now for face consistency
  const promises = selectedPrompts.map((p) => generateSlideImage(p, true));
  
  const responses = await Promise.all(promises);

  // 5. Extract Images
  const images = responses.map((res, index) => {
    const candidate = res?.candidates?.[0];
    if (!candidate?.content?.parts) return "";
    for (const part of candidate.content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return "";
  });

  if (images.some(img => !img)) throw new Error("Some images could not be generated. Please try again.");

  // 6. Assemble Slides
  const slideTypes: StorySlide['type'][] = ['problem', 'belief', 'twist', 'principle', 'process', 'result', 'insight', 'cta'];
  const captions = Array.isArray(storyData.captions) ? storyData.captions : [];

  // Ensure we have enough captions if the AI generated fewer
  while (captions.length < images.length) {
    captions.push("Transformation in progress...");
  }

  const slides: StorySlide[] = images.map((img, i) => {
    let textPos: StorySlide['textPosition'] = 'bottom';
    let badgePos: StorySlide['badgePosition'] = 'top-left';

    // Heuristics for text position based on slide index and arc type
    // Slide 3 (Twist) typically needs text at Top/Bottom depending on if it's a portrait or a macro shot
    if (i === 3) {
        textPos = 'top'; 
        badgePos = 'bottom-right';
    } else if (i === 2) {
      // Twist slide often has face in middle/top, so text bottom usually works, but top can be better for closeups
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
