
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
  const model = 'gemini-3-flash-preview';
  
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

    Output JSON with the following structure:
    {
      "name": "Client Name",
      "captions": ["Caption 1", "Caption 2", "Caption 3", "Caption 4", "Caption 5", "Caption 6", "Caption 7", "Caption 8"],
      "before_outfit_desc": "Visual description of 'Before' outfit: Clean but unflattering, ill-fitting, boring colors, realistic everyday look.",
      "after_outfit_desc": "Visual description of 'After' outfit: Stylish, 'Smart Casual' or 'Chic', flattering fit, confident."
    }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          captions: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          before_outfit_desc: { type: Type.STRING },
          after_outfit_desc: { type: Type.STRING }
        }
      }
    }
  });

  return JSON.parse(response.text || "{}");
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
  const beforeDesc = storyData.before_outfit_desc;
  const afterDesc = storyData.after_outfit_desc;

  // Shared technical specs for the "Selfie" aesthetic
  const techSpecs = "STYLE: Ultra photorealistic, raw smartphone photo, authentic texture, unpolished candid aesthetic. Camera: iPhone Pro main sensor, f/1.8. Visible grain and natural imperfections.";

  const prompts = [
    // Slide 1: Problem (Before - Mirror Selfie)
    `Mirror Selfie. Keep exact face of the woman in this photo. OUTFIT: ${beforeDesc}. 
    POSE: Standing stiffly in front of a mirror, holding a black smartphone. 
    ENVIRONMENT: Messy bedroom or cluttered hallway. 
    LIGHTING: Harsh overhead lighting, unflattering shadows. 
    VIBE: "Before" photo, feeling invisible, mundane. ${techSpecs}`,

    // Slide 2: Wrong Belief (Before - Close Selfie)
    `Close-up Mirror Selfie (Waist up). Keep exact face. OUTFIT: ${beforeDesc}.
    POSE: Holding phone closer to mirror, looking at screen with a "meh" expression.
    ENVIRONMENT: Same messy room.
    LIGHTING: Flat, boring.
    VIBE: Tired, stuck, low energy. ${techSpecs}`,

    // Slide 3: Twist (Detail Selfie)
    `Artistic Mirror Selfie Detail. Keep exact face.
    FOCUS: Extreme close-up in mirror on eyes or hand touching fabric/hair. Phone partially visible.
    LIGHTING: Dim, moody, chiaroscuro.
    VIBE: Realization, intimacy, changing perspective. ${techSpecs}`,

    // Slide 4: Principle (Objects - No Person)
    `Photo of a bed covered in clothes, hangers, and fabric swatches.
    VIEW: POV looking down at the bed (as if taking a photo of the mess).
    LIGHTING: Natural daylight coming from a window.
    VIBE: Creative planning, organizing, aesthetic mess. ${techSpecs}`,

    // Slide 5: Process (Fitting Room Selfie)
    `Mirror Selfie in a Fitting Room. Keep exact face.
    OUTFIT: Wearing the "After" pants with a basic t-shirt, or holding up a blazer.
    POSE: Evaluating the fit, looking critical but hopeful. Holding black smartphone.
    ENVIRONMENT: Department store changing room with multiple mirrors.
    VIBE: Work in progress, trying things on. ${techSpecs}`,

    // Slide 6: Result (After - Golden Hour Selfie)
    `Aesthetic Mirror Selfie. Keep exact face. OUTFIT: ${afterDesc}.
    POSE: Confident "Outfit Check" pose, angled torso, hand relaxed. Holding black smartphone.
    ENVIRONMENT: Clean, stylish bedroom or walk-in closet with white wardrobe.
    LIGHTING: Direct hard sunlight (Golden Hour), sun-drenched, high contrast highlights.
    VIBE: Glow up, radiant, trendy. ${techSpecs}`,

    // Slide 7: Insight (Front Camera Selfie)
    `Front-facing Camera Selfie. Keep exact face. OUTFIT: ${afterDesc} (top details).
    POSE: Looking directly at camera, genuine soft smile.
    BACKGROUND: Blurred simple background (outdoors or nice wall).
    LIGHTING: Soft flattering natural light.
    VIBE: Confidence, happiness, "I love this look". ${techSpecs}`,

    // Slide 8: CTA (Dynamic Selfie)
    `Full-body Mirror Selfie (Final Look). Keep exact face. OUTFIT: ${afterDesc}.
    POSE: Ready to leave, bag on shoulder, holding phone confidently high or low angle.
    ENVIRONMENT: Near front door or elevator mirror.
    LIGHTING: bright and clean.
    VIBE: Action, ready for the world, "Link in bio" energy. ${techSpecs}`
  ];

  // 3. Execute Generations
  // Note: Slide 4 is index 3, pass false for useRefImage
  const promises = prompts.map((p, i) => generateSlideImage(p, i !== 3));
  
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
  const textPositions: StorySlide['textPosition'][] = [
    'bottom', // Problem: Full body, keep text low
    'top',    // Belief: Close up, keep text high to avoid chin/neck
    'bottom', // Twist: Abstract, keep low
    'top',    // Principle: Objects on bed, keep text high
    'bottom', // Process: Fitting room, keep low
    'bottom', // Result: Full outfit, keep low
    'top',    // Insight: Portrait, keep high above head
    'bottom'  // CTA: Action, keep low
  ];
  
  const slides: StorySlide[] = images.map((img, i) => ({
    image: img,
    text: storyData.captions[i] || "",
    type: slideTypes[i],
    textPosition: textPositions[i]
  }));

  return {
    slides,
    storyData: {
      name: storyData.name,
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
