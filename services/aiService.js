const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const { InferenceClient } = require("@huggingface/inference");

// Initialize AI clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const hfClient = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

// ═══════════════════════════════════════════════════════════════════════════
// ║         AI IMAGE PROMPT ENGINEER — Production Grade v2.0              ║
// ║    Optimized for: FLUX · SDXL · Midjourney · DALL·E · Ideogram       ║
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────
// SECTION 1: STYLE PROFILES
// ─────────────────────────────────────────────────────────────────────────
const STYLE_PROFILES = {
  realistic: {
    core: "photorealistic, ultra-realistic, hyperrealistic, true-to-life",
    rendering:
      "shot on Sony A7R IV, 85mm f/1.4 lens, RAW format, natural depth of field",
    lighting:
      "natural golden hour lighting, soft volumetric light, realistic shadows and highlights",
    camera:
      "cinematic composition, rule of thirds, sharp foreground, bokeh background",
    quality:
      "8K UHD, ultra-sharp, HDR, physically-based rendering, photographic fidelity, studio grade",
    negative:
      "cartoon, illustration, painting, anime, CGI, artificial, plastic, overexposed, underexposed, grain, noise, JPEG artifacts, chromatic aberration, lens flare (unwanted), blurry, soft focus, low resolution, watermark, text, signature, extra limbs, bad anatomy, deformed, mutilated, disfigured, cloned face, asymmetrical eyes, bad proportions, extra fingers, missing fingers, fused fingers, floating limbs, disconnected limbs",
  },

  cinematic: {
    core: "cinematic film still, movie quality, epic visual storytelling, anamorphic lens",
    rendering:
      "35mm film stock, ARRI Alexa cinematography, anamorphic widescreen, 2.39:1 aspect ratio",
    lighting:
      "dramatic three-point lighting, practical lights, motivated shadows, cinematic color grading",
    camera:
      "low-angle hero shot, dynamic framing, shallow depth of field, focus pull, cinematic bokeh",
    quality:
      "award-winning cinematography, Hollywood production quality, ultra-detailed, 8K cinema, IMAX grade",
    negative:
      "amateur photography, snapshot, poorly lit, overexposed, flat lighting, no depth, bad composition, watermark, text, blurry, motion blur (unwanted), distorted, bad anatomy, extra limbs, ugly, deformed",
  },

  anime: {
    core: "anime style, high-quality manga illustration, Japanese animation studio quality",
    rendering:
      "Studio Ghibli-level detail, Makoto Shinkai sky quality, cel-shaded, clean linework",
    lighting:
      "anime-style rim lighting, soft gradient shadows, dramatic specular highlights, ambient occlusion",
    camera:
      "dynamic anime perspective, expressive composition, wide emotional framing",
    quality:
      "ultra-detailed, 4K anime, crisp lines, vibrant saturated colors, professional key visual, promotional art quality",
    negative:
      "western cartoon, 3D render, photorealistic, ugly face, off-model, bad proportions, poorly drawn hands, extra fingers, missing eyes, asymmetrical face, bad anatomy, deformed, low detail, rough sketch, NSFW, watermark, signature, blurry, low quality",
  },

  cartoon: {
    core: "professional cartoon illustration, stylized character art, clean vector-like aesthetic",
    rendering:
      "bold outlines, flat colors with subtle shading, cel-shaded, expressive character design",
    lighting:
      "simplified cartoon lighting, bright fill light, soft drop shadows",
    camera: "playful framing, exaggerated perspective, dynamic pose",
    quality:
      "high-resolution cartoon art, clean digital illustration, professional animation studio quality, crisp edges",
    negative:
      "realistic, photographic, anime, overly detailed textures, gritty, dark, horror, bad proportions, extra limbs, deformed, ugly, low quality, blurry, sketch lines, rough",
  },

  fantasy: {
    core: "epic fantasy art, high fantasy illustration, magical world-building, legendary atmosphere",
    rendering:
      "detailed concept art, matte painting quality, painterly textures, fantasy realism",
    lighting:
      "dramatic magical lighting, god rays, glowing arcane energy, mystical atmosphere, bioluminescence",
    camera:
      "epic wide establishing shot, heroic framing, sweeping landscape or dramatic close-up",
    quality:
      "award-winning fantasy illustration, 8K, ultra-detailed, professional concept art, gallery-quality digital painting",
    negative:
      "modern setting, sci-fi elements, photorealistic (unless intended), poor anatomy, bad proportions, extra limbs, deformed faces, blurry, low quality, watermark, text, amateur",
  },

  cyberpunk: {
    core: "cyberpunk aesthetic, neo-noir futurism, high-tech dystopia, biopunk",
    rendering:
      "neon-lit city, holographic interfaces, rain-slicked streets, chrome and carbon fiber",
    lighting:
      "dramatic neon backlighting, rim light in cyan/magenta/amber, haze and fog, lens flare accents",
    camera:
      "Dutch angle for tension, wide-angle urban framing, low-angle hero shot, rain effect",
    quality:
      "ultra-detailed, 8K, cinematic quality, Blade Runner 2049 visual fidelity, Akira-level detail",
    negative:
      "natural daylight, rural setting, cheerful, pastel colors, low tech, bad anatomy, extra limbs, deformed, watermark, text, blurry, low quality",
  },

  watercolor: {
    core: "professional watercolor painting, loose expressive brushwork, luminous washes",
    rendering:
      "wet-on-wet technique, bleeding edges, granulation texture, white paper showing through",
    lighting:
      "soft diffused light, transparent overlapping glazes, delicate highlights",
    camera:
      "artistic composition, balanced negative space, organic flowing arrangement",
    quality:
      "museum-quality watercolor, 300gsm cold-press paper texture, master artist level, high resolution scan",
    negative:
      "digital-looking, plastic, over-rendered, harsh edges, photorealistic, 3D render, anime, flat colors, no texture, watermark, text, blurry",
  },

  "oil painting": {
    core: "classical oil painting, old master technique, rich impasto texture",
    rendering:
      "visible brushwork, layered glazes, chiaroscuro, Rembrandt-like depth and warmth",
    lighting:
      "dramatic Baroque lighting, warm amber tones, deep shadow contrast, dramatic highlights",
    camera:
      "classical portrait or landscape composition, Dutch Golden Age framing",
    quality:
      "museum-quality oil painting, gallery-level fine art, highly detailed, masterpiece, 16K scan resolution",
    negative:
      "digital art, photorealistic, anime, cartoon, flat colors, no texture, watercolor, acrylic, watermark, text, modern aesthetic",
  },

  sketch: {
    core: "detailed pencil sketch, fine art drawing, expressive hand-drawn illustration",
    rendering:
      "cross-hatching, graphite shading, gesture lines, construction marks, artist's sketch",
    lighting:
      "dramatic hatching for shadows, light areas as white paper, tonal range through line density",
    camera: "artist's eye composition, dynamic line weight, expressive angles",
    quality:
      "master draughtsman quality, fine art sketchbook, high-resolution scan, detailed linework",
    negative:
      "color, painted, digital-looking, cartoon, anime, photorealistic, blurry, low detail, rough, sloppy, watermark",
  },

  "digital art": {
    core: "professional digital illustration, concept art, polished digital painting",
    rendering:
      "digital painting techniques, clean rendering, hard and soft brush blend, layer effects",
    lighting:
      "dramatic rim lighting, HDR-quality lighting, specular highlights, subsurface scattering",
    camera: "dynamic cinematic composition, rule of thirds, strong focal point",
    quality:
      "ArtStation-quality, 8K, ultra-detailed, trending on ArtStation, professional concept art, portfolio-grade",
    negative:
      "amateurish, sketch-like, rough, unfinished, low quality, bad anatomy, extra limbs, deformed, watermark, text, blurry, noisy",
  },

  minimalist: {
    core: "ultra-clean minimalist design, negative space mastery, refined simplicity",
    rendering:
      "flat design with subtle depth, limited color palette, geometric precision",
    lighting: "soft even illumination, no harsh shadows, clean studio lighting",
    camera:
      "centered symmetrical composition, generous breathing room, intentional emptiness",
    quality:
      "Bauhaus-inspired precision, luxury brand aesthetic, pristine edges, print-quality resolution",
    negative:
      "cluttered, busy, detailed textures, gradient overload, drop shadows, bevel, emboss, vintage, grunge, extra elements, noise, watermark, text",
  },

  abstract: {
    core: "expressive abstract art, non-representational, emotional visual language",
    rendering:
      "gestural mark-making, layered forms, texture collage, organic and geometric interplay",
    lighting:
      "dramatic contrast, tonal depth, luminous inner glow, translucent layers",
    camera: "full-bleed composition, dynamic flow, intentional asymmetry",
    quality:
      "gallery-quality abstract art, museum-grade print, rich color saturation, high-resolution artwork",
    negative:
      "realistic, recognizable subjects, bad composition, muddy colors, overworked, cluttered without intent, watermark, text",
  },

  vintage: {
    core: "authentic vintage aesthetic, period-accurate visual style, nostalgic atmosphere",
    rendering:
      "aged film grain, faded color palette, light leaks, dust and scratch overlay",
    lighting:
      "warm sepia tones, faded highlights, soft vignette, analog photography feel",
    camera:
      "classic portrait or reportage framing, candid feel, Kodachrome color grading",
    quality:
      "high-resolution vintage scan quality, authentic retro details, editorial quality",
    negative:
      "modern, digital, clean, HDR, oversaturated, new, futuristic, plastic, synthetic, watermark, text, blurry (unwanted)",
  },
};

// ─────────────────────────────────────────────────────────────────────────
// SECTION 2: UNIVERSAL QUALITY ANCHORS
// ─────────────────────────────────────────────────────────────────────────
const UNIVERSAL_QUALITY = [
  "masterpiece",
  "best quality",
  "highly detailed",
  "sharp focus",
  "professional",
  "aesthetically strong",
  "visually coherent",
];

// ─────────────────────────────────────────────────────────────────────────
// SECTION 3: UNIVERSAL NEGATIVE ANCHORS
// ─────────────────────────────────────────────────────────────────────────
const UNIVERSAL_NEGATIVES = [
  "blurry",
  "out of focus",
  "low quality",
  "low resolution",
  "poorly drawn",
  "bad anatomy",
  "extra limbs",
  "extra fingers",
  "missing fingers",
  "fused fingers",
  "bad hands",
  "deformed",
  "distorted",
  "mutilated",
  "disfigured",
  "ugly face",
  "cloned face",
  "bad proportions",
  "malformed",
  "floating limbs",
  "disconnected body parts",
  "duplicate",
  "two heads",
  "watermark",
  "signature",
  "text overlay",
  "username",
  "artist name",
  "copyright",
  "artifacts",
  "JPEG compression",
  "pixel noise",
  "oversaturation",
  "overexposed",
  "underexposed",
  "unnatural colors",
  "cropped head",
  "frame cut",
  "out of frame",
  "draft",
  "unfinished",
];

// ─────────────────────────────────────────────────────────────────────────
// SECTION 4: SUBJECT INTELLIGENCE LAYER
// ─────────────────────────────────────────────────────────────────────────
const SUBJECT_INTELLIGENCE = {
  person: {
    triggers: [
      "person",
      "man",
      "woman",
      "girl",
      "boy",
      "human",
      "character",
      "portrait",
      "face",
      "people",
      "child",
      "warrior",
      "hero",
      "model",
      "soldier",
    ],
    boosters:
      "anatomically correct, natural skin texture with subtle pores, realistic eye reflections with catchlights, natural hair strands, proper limb proportions, detailed hands with correct finger count, expressive facial micro-expressions, physically plausible clothing folds and drape",
    negatives:
      "extra fingers, missing fingers, bad hands, fused hands, extra arms, missing limbs, floating hands, asymmetrical eyes, crossed eyes, blank eyes, dead eyes, melting face, double chin (unintended), bad teeth",
  },

  landscape: {
    triggers: [
      "landscape",
      "mountain",
      "forest",
      "city",
      "ocean",
      "desert",
      "valley",
      "sky",
      "sunset",
      "sunrise",
      "field",
      "river",
      "beach",
      "island",
      "waterfall",
      "canyon",
    ],
    boosters:
      "atmospheric perspective and depth layers, realistic cloud formations, naturalistic foliage with wind movement implied, accurate shadow direction from single light source, foreground-midground-background depth separation, environmental storytelling",
    negatives:
      "floating terrain, impossible geography, inconsistent shadow directions, flat horizon, no depth, artificial-looking sky",
  },

  animal: {
    triggers: [
      "animal",
      "dog",
      "cat",
      "horse",
      "bird",
      "lion",
      "tiger",
      "wolf",
      "eagle",
      "dragon",
      "creature",
      "beast",
      "wildlife",
      "insect",
      "fish",
    ],
    boosters:
      "anatomically accurate animal physiology, realistic fur/feather/scale texture with directional growth, authentic species markings, natural pose and weight distribution, believable musculature, species-accurate proportions",
    negatives:
      "extra legs, missing limbs, wrong number of limbs, deformed snout, blank eyes, fused body parts, unnatural proportions",
  },

  architecture: {
    triggers: [
      "building",
      "architecture",
      "interior",
      "room",
      "house",
      "castle",
      "temple",
      "bridge",
      "structure",
      "facade",
      "hallway",
      "corridor",
      "skyscraper",
    ],
    boosters:
      "accurate vanishing point perspective, realistic material properties (concrete, glass, wood, stone), ambient occlusion in corners and joints, structural integrity believability, detailed surface textures and aging, intentional human scale reference",
    negatives:
      "impossible geometry, floating elements, inconsistent perspective, melting walls, no depth, flat textures",
  },

  vehicle: {
    triggers: [
      "car",
      "vehicle",
      "truck",
      "motorcycle",
      "plane",
      "spaceship",
      "ship",
      "train",
      "bike",
      "jet",
      "submarine",
      "tank",
    ],
    boosters:
      "accurate mechanical detailing, reflective metallic surfaces with environment mapping, realistic tire contact with ground, correct panel gaps, branded or genre-accurate design language",
    negatives:
      "incorrect wheel count, floating vehicles, no ground shadow, distorted body panels, wrong perspective",
  },

  food: {
    triggers: [
      "food",
      "meal",
      "dish",
      "restaurant",
      "cuisine",
      "drink",
      "coffee",
      "cake",
      "fruit",
      "vegetable",
      "dessert",
      "beverage",
    ],
    boosters:
      "appetizing food styling, correct food textures (steam, glaze, crunch, frost), macro food photography quality, plating presentation worthy of a Michelin-starred restaurant, natural food colors",
    negatives:
      "unappetizing, artificial colors, wrong food texture, plastic-looking, melted or deformed food",
  },
};

// ─────────────────────────────────────────────────────────────────────────
// SECTION 5: MOOD & ATMOSPHERE INTELLIGENCE
// ─────────────────────────────────────────────────────────────────────────
const MOOD_KEYWORDS = {
  dramatic:
    "high contrast dramatic lighting, deep shadows, intense atmosphere, emotional weight",
  peaceful:
    "soft diffused light, tranquil atmosphere, serene color palette, gentle warmth",
  mysterious:
    "low-key moody lighting, fog and haze, hidden details, enigmatic framing",
  epic: "sweeping grand scale, heroic framing, awe-inspiring composition, powerful color grading",
  romantic:
    "warm golden bokeh, soft focus edges, intimate framing, tender atmosphere",
  dark: "deep shadow contrast, desaturated palette, noir atmosphere, oppressive weight",
  vibrant:
    "bold saturated colors, energetic composition, dynamic movement implied",
  melancholic:
    "cool blue tones, overcast soft light, lonely wide framing, quiet stillness",
  joyful:
    "bright warm tones, uplifting composition, light and airy, cheerful color palette",
  tense: "tight framing, low angle, sharp contrast, motion blur on edges",
};

// ─────────────────────────────────────────────────────────────────────────
// SECTION 6: HELPER UTILITIES
// ─────────────────────────────────────────────────────────────────────────

/**
 * Detects which subject category best matches the user prompt
 * @param {string} prompt
 * @returns {{ key: string, data: object } | null}
 */
const detectSubject = (prompt) => {
  const lower = prompt.toLowerCase();
  for (const [key, data] of Object.entries(SUBJECT_INTELLIGENCE)) {
    if (data.triggers.some((t) => lower.includes(t))) {
      return { key, data };
    }
  }
  return null;
};

/**
 * Detects mood/emotional tone from the prompt
 * @param {string} prompt
 * @returns {string | null}
 */
const detectMood = (prompt) => {
  const lower = prompt.toLowerCase();
  for (const [mood, enhancement] of Object.entries(MOOD_KEYWORDS)) {
    if (lower.includes(mood)) return enhancement;
  }
  return null;
};

/**
 * Cleans and deduplicates a negative prompt array → comma-separated string
 * @param {string[]} arr
 * @returns {string}
 */
const buildNegativePrompt = (...arrays) => {
  const combined = arrays.flatMap((a) =>
    typeof a === "string"
      ? a
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : a || [],
  );
  return [...new Set(combined)].join(", ");
};

/**
 * Safely normalizes style key
 * @param {string} style
 * @returns {string}
 */
const normalizeStyle = (style) => (style || "realistic").toLowerCase().trim();

// ─────────────────────────────────────────────────────────────────────────
// SECTION 7: MAIN ENHANCE FUNCTION
// ─────────────────────────────────────────────────────────────────────────

/**
 * Transforms a simple user prompt into a production-grade AI image prompt.
 *
 * @param {string} userPrompt   - Raw user input (e.g. "a knight in a forest")
 * @param {string} style        - Visual style key (e.g. "realistic", "anime")
 * @param {object} [options]    - Optional overrides
 * @param {boolean} [options.includeNegative=true]  - Append negative prompt block
 * @param {boolean} [options.verbose=false]          - Return structured breakdown object
 * @param {string}  [options.aspectRatio]            - e.g. "16:9", "1:1", "9:16"
 * @param {string}  [options.targetModel]            - e.g. "midjourney", "dalle", "flux"
 *
 * @returns {string | object} Enhanced prompt string, or verbose breakdown object
 */
const enhancePrompt = (userPrompt, style, options = {}) => {
  const {
    includeNegative = true,
    verbose = false,
    aspectRatio = null,
    targetModel = null,
  } = options;

  // ── 1. Guard input ──────────────────────────────────────────
  if (!userPrompt || typeof userPrompt !== "string" || !userPrompt.trim()) {
    throw new Error("[enhancePrompt] userPrompt must be a non-empty string.");
  }

  const cleanPrompt = userPrompt.trim();
  const styleKey = normalizeStyle(style);

  // ── 2. Resolve style profile (fallback → realistic) ─────────
  const profile = STYLE_PROFILES[styleKey] || STYLE_PROFILES["realistic"];

  // ── 3. Subject intelligence ─────────────────────────────────
  const subjectMatch = detectSubject(cleanPrompt);
  const subjectBoosters = subjectMatch ? subjectMatch.data.boosters : null;
  const subjectNegatives = subjectMatch ? subjectMatch.data.negatives : null;

  // ── 4. Mood intelligence ────────────────────────────────────
  const moodEnhancement = detectMood(cleanPrompt);

  // ── 5. Model-specific suffix ────────────────────────────────
  const modelHints = {
    midjourney: "--quality 2 --stylize 750",
    flux: "rendered with FLUX, physically accurate materials",
    dalle: "DALL-E optimized, clear subject, coherent composition",
    sdxl: "SDXL optimized, high fidelity, detailed latent space",
    leonardo: "Leonardo AI, high detail, cinematic render",
    ideogram: "Ideogram style, sharp text handling, clear composition",
  };
  const modelSuffix = targetModel
    ? modelHints[targetModel.toLowerCase()] || null
    : null;

  // ── 6. Aspect ratio hint ────────────────────────────────────
  const ratioHint = aspectRatio
    ? `aspect ratio ${aspectRatio}, ${
        aspectRatio === "9:16"
          ? "vertical portrait framing"
          : aspectRatio === "16:9"
            ? "widescreen cinematic framing"
            : aspectRatio === "1:1"
              ? "square centered composition"
              : "custom framing"
      }`
    : null;

  // ── 7. Assemble positive prompt ─────────────────────────────
  const positiveComponents = [
    // User's original intent — always first, never altered
    cleanPrompt,

    // Style identity
    profile.core,

    // Subject-specific anatomy/material boosters
    subjectBoosters,

    // Rendering technique
    profile.rendering,

    // Lighting
    profile.lighting,

    // Mood override (if detected)
    moodEnhancement,

    // Camera & composition
    profile.camera,

    // Aspect ratio
    ratioHint,

    // Universal quality anchors
    UNIVERSAL_QUALITY.join(", "),

    // Style-specific quality terms
    profile.quality,

    // Model suffix
    modelSuffix,
  ]
    .filter(Boolean)
    .join(", ");

  // ── 8. Assemble negative prompt ─────────────────────────────
  const negativePromptString = buildNegativePrompt(
    UNIVERSAL_NEGATIVES,
    profile.negative,
    subjectNegatives || "",
  );

  // ── 9. Build final output ───────────────────────────────────
  if (verbose) {
    return {
      positivePrompt: positiveComponents,
      negativePrompt: negativePromptString,
      detectedStyle: styleKey,
      detectedSubject: subjectMatch ? subjectMatch.key : "general",
      detectedMood: moodEnhancement || "neutral",
      aspectRatio: aspectRatio || "auto",
      targetModel: targetModel || "universal",
      characterCount: positiveComponents.length,
      wordCount: positiveComponents.split(/\s+/).length,
    };
  }

  if (includeNegative) {
    return `${positiveComponents}\n\nNegative prompt: ${negativePromptString}`;
  }

  return positiveComponents;
};

// ─────────────────────────────────────────────────────────────────────────
// SECTION 8: LOGO/ICON ENHANCED PROMPT
// ─────────────────────────────────────────────────────────────────────────

/**
 * Specialized prompt enhancement for logo and icon generation
 * @param {string} userPrompt   - Logo description (e.g. "tech company logo")
 * @param {string} style        - Logo style (e.g. "modern", "minimal")
 * @param {object} [options]    - Optional overrides
 * @returns {string} Enhanced logo-specific prompt
 */
const enhanceLogoPrompt = (userPrompt, style, options = {}) => {
  // Map logo styles to general style profiles
  const logoStyleMap = {
    modern: "digital art",
    minimalist: "minimalist",
    corporate: "digital art",
    creative: "digital art",
    tech: "cyberpunk",
    luxury: "digital art",
    playful: "cartoon",
    bold: "digital art",
    elegant: "oil painting",
    geometric: "abstract",
    organic: "digital art",
    vintage: "vintage",
  };

  // Normalize style
  const baseStyle = logoStyleMap[style.toLowerCase()] || "digital art";

  // Logo-specific quality additions
  const logoAdditions =
    "vector art style, clean design, professional logo, scalable, high contrast, clear lines, brand identity, transparent background, centered composition, logo design";

  // Construct logo-specific prompt
  const logoPrompt = `${userPrompt}, ${logoAdditions}`;

  // Use the main enhance function but mark as logo
  const result = enhancePrompt(logoPrompt, baseStyle, {
    ...options,
    includeNegative: true,
  });

  // If result is an object (verbose mode), return it as-is
  if (typeof result === "object") {
    return result;
  }

  // Add logo-specific negative terms to the regular result
  const logoNegatives =
    "pixelated, low resolution, cluttered, busy design, poor typography, amateur, distorted text, pixelation, raster, bitmap";

  const negativeIndex = result.indexOf("\n\nNegative prompt: ");
  if (negativeIndex > -1) {
    const positivePrompt = result.substring(0, negativeIndex);
    const negativePrompt = result.substring(negativeIndex + 18);
    return `${positivePrompt}\n\nNegative prompt: ${logoNegatives}, ${negativePrompt}`;
  }

  return result;
};

// ─────────────────────────────────────────────────────────────────────────
// SECTION 9: CONVENIENCE EXPORTS & UTILITIES
// ─────────────────────────────────────────────────────────────────────────

/**
 * Returns all supported style keys
 * @returns {string[]}
 */
const getSupportedStyles = () => Object.keys(STYLE_PROFILES);

/**
 * Batch enhance multiple prompts
 * @param {Array<{prompt: string, style: string, options?: object}>} items
 * @returns {string[]}
 */
const batchEnhance = (items) =>
  items.map(({ prompt, style, options }) =>
    enhancePrompt(prompt, style, options),
  );

// Gemini AI Service (Note: Gemini doesn't generate images directly)
const generateImageWithGemini = async (prompt, style) => {
  try {
    // Gemini doesn't support image generation yet
    // This is a placeholder that will always fail and fallback to other services
    console.log("Gemini image generation not supported, will fallback...");

    return {
      success: false,
      error: "Gemini does not support image generation",
      provider: "gemini",
    };
  } catch (error) {
    console.error("Gemini generation error:", error);
    return {
      success: false,
      error: error.message,
      provider: "gemini",
    };
  }
};

// Hugging Face Service (Free Alternative)
const generateImageWithHuggingFace = async (prompt, style) => {
  try {
    // Check if API key exists
    if (
      !process.env.HUGGINGFACE_API_KEY ||
      process.env.HUGGINGFACE_API_KEY === "your_huggingface_api_key_here"
    ) {
      throw new Error("Hugging Face API key not configured");
    }

    console.log(
      "Using Hugging Face API key:",
      process.env.HUGGINGFACE_API_KEY
        ? `${process.env.HUGGINGFACE_API_KEY.substring(0, 10)}...`
        : "NOT SET",
    );

    const enhancedPrompt = enhancePrompt(prompt, style);
    console.log("Hugging Face enhanced prompt:", enhancedPrompt);

    // Try multiple models until one works
    // const models = [
    //   'runwayml/stable-diffusion-v1-5',
    //   'stabilityai/stable-diffusion-2-1',
    //   'CompVis/stable-diffusion-v1-4',
    //   'stabilityai/stable-diffusion-xl-base-1.0'
    // ];
    const models = [
      "black-forest-labs/FLUX.1-schnell",
      "stabilityai/stable-diffusion-3-medium-diffusers",
      "ByteDance/SDXL-Lightning",
    ];

    let response;
    let lastError;

    for (const model of models) {
      try {
        console.log(`Trying Hugging Face model: ${model}`);
        response = await fetch(
          `https://router.huggingface.co/hf-inference/models/${model}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: enhancedPrompt,
              options: { wait_for_model: true },
            }),
          },
        );

        if (response.ok) {
          console.log(`✅ Success with model: ${model}`);
          break;
        } else {
          const errorText = await response.text();
          console.log(
            `❌ Model ${model} failed: ${response.status} - ${errorText}`,
          );
          lastError = `${response.status} - ${errorText}`;
        }
      } catch (error) {
        console.log(`❌ Model ${model} error:`, error.message);
        lastError = error.message;
      }
    }

    if (!response || !response.ok) {
      throw new Error(
        `All Hugging Face models failed. Last error: ${lastError}`,
      );
    }

    // Hugging Face returns image as blob/buffer
    const imageBuffer = await response.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");

    return {
      success: true,
      imageData: imageBase64,
      provider: "huggingface",
    };
  } catch (error) {
    console.error("Hugging Face generation error:", error);
    return {
      success: false,
      error: error.message,
      provider: "huggingface",
    };
  }
};

// OpenAI Service (Using Official Library)
const generateImageWithOpenAI = async (prompt, style) => {
  try {
    const enhancedPrompt = enhancePrompt(prompt, style);

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: enhancedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "b64_json",
    });

    return {
      success: true,
      imageData: response.data[0].b64_json,
      provider: "openai",
    };
  } catch (error) {
    console.error("OpenAI generation error:", error);
    return {
      success: false,
      error: error.message,
      provider: "openai",
    };
  }
};

// Main generation function with fallback
const generateImage = async (prompt, style) => {
  try {
    // Try Gemini first
    console.log("Attempting image generation with Gemini...");
    const geminiResult = await generateImageWithGemini(prompt, style);

    if (geminiResult.success) {
      return geminiResult;
    }

    // Fallback to OpenAI
    console.log("Gemini failed, falling back to OpenAI...");
    const openaiResult = await generateImageWithOpenAI(prompt, style);

    if (openaiResult.success) {
      return openaiResult;
    }

    // Final fallback to Hugging Face (Free)
    console.log("OpenAI failed, falling back to Hugging Face (Free)...");
    const huggingfaceResult = await generateImageWithHuggingFace(prompt, style);

    if (huggingfaceResult.success) {
      return huggingfaceResult;
    }

    // All providers failed
    throw new Error("All AI providers failed to generate image");
  } catch (error) {
    console.error("Image generation failed:", error);
    return {
      success: false,
      error: error.message,
      provider: "none",
    };
  }
};

// Save image to public folder
const saveImageToPublic = (imageBase64, filename) => {
  try {
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const imagePath = path.join(
      __dirname,
      "../public/images/generated",
      filename,
    );

    // Ensure directory exists
    const dir = path.dirname(imagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(imagePath, imageBuffer);

    return {
      success: true,
      imagePath: `/images/generated/${filename}`,
      fullPath: imagePath,
    };
  } catch (error) {
    console.error("Error saving image:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Generate unique filename
const generateFilename = (extension = "png") => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  return `img_${timestamp}_${random}.${extension}`;
};

// Image Blending Service
const blendImages = async (images, prompt, style) => {
  try {
    // Convert uploaded images to base64 for AI processing
    const imageBase64Array = images.map((image) => {
      return Buffer.from(image.buffer).toString("base64");
    });

    console.log(`Blending ${images.length} images with prompt: ${prompt}`);

    // Try Hugging Face blending first
    const blendResult = await blendImagesWithHuggingFace(
      imageBase64Array,
      prompt,
      style,
    );

    if (blendResult.success) {
      return blendResult;
    }

    // Fallback: Try OpenAI DALL-E with image editing (if available)
    console.log("Hugging Face blending failed, trying OpenAI image editing...");
    const openaiResult = await blendImagesWithOpenAI(
      imageBase64Array,
      prompt,
      style,
    );

    if (openaiResult.success) {
      return openaiResult;
    }

    // Final fallback: Use regular generation with enhanced prompt
    console.log(
      "All image-based blending failed, using text-based generation...",
    );
    const fallbackPrompt = `${prompt}, artistic blend of ${images.length} different images, composite artwork, merged elements, fusion of multiple visual elements`;

    const fallbackResult = await generateImage(fallbackPrompt, style);

    if (fallbackResult.success) {
      return {
        success: true,
        imageData: fallbackResult.imageData,
        provider: fallbackResult.provider,
        blendedImages: images.length,
        method: "text-based-fallback",
      };
    }

    return {
      success: false,
      error: "Image blending failed with all providers",
      provider: "none",
    };
  } catch (error) {
    console.error("Image blending error:", error);
    return {
      success: false,
      error: error.message,
      provider: "none",
    };
  }
};

// Hugging Face Image Blending with actual image input
const blendImagesWithHuggingFace = async (imageBase64Array, prompt, style) => {
  try {
    // Check if API key exists
    if (
      !process.env.HUGGINGFACE_API_KEY ||
      process.env.HUGGINGFACE_API_KEY === "your_huggingface_api_key_here"
    ) {
      throw new Error("Hugging Face API key not configured");
    }

    const enhancedPrompt = enhancePrompt(prompt, style);
    console.log("Hugging Face blend prompt:", enhancedPrompt);
    console.log(
      `Processing ${imageBase64Array.length} uploaded images for blending`,
    );

    // Use the first image as base for img2img transformation
    const baseImage = imageBase64Array[0];

    // Try image-to-image models that support init_image
    const img2imgModels = [
      "runwayml/stable-diffusion-v1-5",
      "stabilityai/stable-diffusion-2-1-base",
      "CompVis/stable-diffusion-v1-4",
    ];

    let response;
    let lastError;

    for (const model of img2imgModels) {
      try {
        console.log(`Trying Hugging Face img2img model: ${model}`);

        // For image-to-image, we need to send the image as binary data
        const requestBody = {
          inputs: enhancedPrompt,
          parameters: {
            init_image: baseImage,
            strength: 0.75, // How much to change the original image (0.1 = subtle, 1.0 = completely new)
            guidance_scale: 7.5,
            num_inference_steps: 20,
            negative_prompt:
              "blurry, bad quality, distorted, ugly, bad anatomy",
          },
          options: {
            wait_for_model: true,
            use_cache: false,
          },
        };

        response = await fetch(
          `https://router.huggingface.co/hf-inference/models/${model}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          },
        );

        if (response.ok) {
          console.log(`✅ Image-to-image blend success with model: ${model}`);
          break;
        } else {
          const errorText = await response.text();
          console.log(
            `❌ Img2img model ${model} failed: ${response.status} - ${errorText}`,
          );
          lastError = `${response.status} - ${errorText}`;
        }
      } catch (error) {
        console.log(`❌ Img2img model ${model} error:`, error.message);
        lastError = error.message;
      }
    }

    if (!response || !response.ok) {
      throw new Error(
        `All Hugging Face img2img models failed. Last error: ${lastError}`,
      );
    }

    const imageBuffer = await response.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");

    return {
      success: true,
      imageData: imageBase64,
      provider: "huggingface",
      blendedImages: imageBase64Array.length,
      method: "image-to-image",
    };
  } catch (error) {
    console.error("Hugging Face img2img blend error:", error);
    return {
      success: false,
      error: error.message,
      provider: "huggingface",
    };
  }
};

// OpenAI Image Blending (DALL-E 2 Image Editing)
const blendImagesWithOpenAI = async (imageBase64Array, prompt, style) => {
  try {
    // Check if API key exists
    if (
      !process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY === "your_openai_api_key_here"
    ) {
      throw new Error("OpenAI API key not configured");
    }

    const enhancedPrompt = enhancePrompt(prompt, style);
    console.log("OpenAI blend prompt:", enhancedPrompt);
    console.log(
      `Processing ${imageBase64Array.length} uploaded images for OpenAI blending`,
    );

    // Use the first image as base for editing
    const baseImage = imageBase64Array[0];

    // Convert base64 to buffer for OpenAI API
    const imageBuffer = Buffer.from(baseImage, "base64");

    // Create form data for OpenAI API
    const formData = new FormData();
    formData.append(
      "image",
      new Blob([imageBuffer], { type: "image/png" }),
      "image.png",
    );
    formData.append("prompt", enhancedPrompt);
    formData.append("n", "1");
    formData.append("size", "1024x1024");
    formData.append("response_format", "b64_json");

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI blend error:", errorText);
      throw new Error(`OpenAI blend error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (result.data && result.data[0] && result.data[0].b64_json) {
      return {
        success: true,
        imageData: result.data[0].b64_json,
        provider: "openai",
        blendedImages: imageBase64Array.length,
        method: "image-editing",
      };
    } else {
      throw new Error("No image data received from OpenAI");
    }
  } catch (error) {
    console.error("OpenAI blend error:", error);
    return {
      success: false,
      error: error.message,
      provider: "openai",
    };
  }
};

// Logo/Icon Generation Service
const generateLogo = async (prompt, style) => {
  try {
    console.log(
      `Generating logo with prompt: "${prompt}" and style: "${style}"`,
    );

    // Use the same working generation system but with logo-enhanced prompts
    const logoEnhancedPrompt = enhanceLogoPrompt(prompt, style);
    console.log(
      "Using working image generation system for logo with enhanced prompt",
    );

    // Use the existing working generateImage function with logo-specific prompt
    const result = await generateImage(logoEnhancedPrompt, "digital art");

    if (result.success) {
      return {
        success: true,
        imageData: result.imageData,
        provider: result.provider,
        method: "logo-enhanced-generation",
      };
    }

    throw new Error("Logo generation failed with working system");
  } catch (error) {
    console.error("Logo generation failed:", error);
    return {
      success: false,
      error: error.message,
      provider: "none",
    };
  }
};

// Gemini Logo Generation (Placeholder)
const generateLogoWithGemini = async (prompt, style) => {
  try {
    console.log("Gemini logo generation not supported, will fallback...");
    return {
      success: false,
      error: "Gemini does not support logo generation",
      provider: "gemini",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      provider: "gemini",
    };
  }
};

// OpenAI Logo Generation
const generateLogoWithOpenAI = async (prompt, style) => {
  try {
    if (
      !process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY === "your_openai_api_key_here"
    ) {
      throw new Error("OpenAI API key not configured");
    }

    const enhancedPrompt = enhanceLogoPrompt(prompt, style);
    console.log("OpenAI logo prompt:", enhancedPrompt);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
      response_format: "b64_json",
    });

    if (response.data && response.data[0] && response.data[0].b64_json) {
      return {
        success: true,
        imageData: response.data[0].b64_json,
        provider: "openai",
        model: "dall-e-3",
      };
    } else {
      throw new Error("No image data received from OpenAI");
    }
  } catch (error) {
    console.error("OpenAI logo generation error:", error);
    return {
      success: false,
      error: error.message,
      provider: "openai",
    };
  }
};

// Hugging Face Logo Generation
const generateLogoWithHuggingFace = async (prompt, style) => {
  try {
    if (
      !process.env.HUGGINGFACE_API_KEY ||
      process.env.HUGGINGFACE_API_KEY === "your_huggingface_api_key_here"
    ) {
      throw new Error("Hugging Face API key not configured");
    }

    const enhancedPrompt = enhanceLogoPrompt(prompt, style);
    console.log("Hugging Face logo prompt:", enhancedPrompt);

    // Try multiple models for logo generation
    const models = [
      "stabilityai/stable-diffusion-2-1",
      "runwayml/stable-diffusion-v1-5",
      "CompVis/stable-diffusion-v1-4",
    ];

    let response;
    let lastError;

    for (const model of models) {
      try {
        console.log(`Trying Hugging Face logo model: ${model}`);
        response = await fetch(
          `https://router.huggingface.co/hf-inference/models/${model}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: enhancedPrompt,
              parameters: {
                negative_prompt:
                  "blurry, pixelated, low resolution, cluttered, busy design, poor typography",
                num_inference_steps: 30,
                guidance_scale: 8.0,
              },
              options: {
                wait_for_model: true,
                use_cache: false,
              },
            }),
          },
        );

        if (response.ok) {
          console.log(`✅ Logo success with model: ${model}`);
          break;
        } else {
          const errorText = await response.text();
          console.log(
            `❌ Logo model ${model} failed: ${response.status} - ${errorText}`,
          );
          lastError = `${response.status} - ${errorText}`;
        }
      } catch (error) {
        console.log(`❌ Logo model ${model} error:`, error.message);
        lastError = error.message;
      }
    }

    if (!response || !response.ok) {
      throw new Error(
        `All Hugging Face logo models failed. Last error: ${lastError}`,
      );
    }

    const imageBuffer = await response.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");

    return {
      success: true,
      imageData: imageBase64,
      provider: "huggingface",
    };
  } catch (error) {
    console.error("Hugging Face logo generation error:", error);
    return {
      success: false,
      error: error.message,
      provider: "huggingface",
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────
// SECTION 10: VIDEO GENERATION SERVICE
// ─────────────────────────────────────────────────────────────────────────

/**
 * Generates video from text prompt using Wan-AI model
 * @param {string} prompt - Text description for video generation
 * @param {string} style - Visual style (optional, used in prompt enhancement)
 * @returns {Promise<{success: boolean, videoBlob?: Blob, provider: string, error?: string}>}
 */
const generateVideoWithHuggingFace = async (prompt, style = "realistic") => {
  try {
    // Validate API key
    if (
      !process.env.HUGGINGFACE_API_KEY ||
      process.env.HUGGINGFACE_API_KEY === "your_huggingface_api_key_here"
    ) {
      throw new Error("Hugging Face API key not configured");
    }

    // Enhance the prompt for better video generation
    const enhancedPrompt = enhancePrompt(prompt, style, {
      includeNegative: false, // Video models work differently
      verbose: false,
    });

    console.log(`[VIDEO] Generating video with prompt: ${enhancedPrompt}`);

    // Call Hugging Face Text-to-Video API using Inference Client
    const video = await hfClient.textToVideo({
      inputs: enhancedPrompt,
      model: "Wan-AI/Wan2.2-T2V-A14B",
      parameters: {
        provider: "replicate",
      },
    });

    if (!video) {
      throw new Error("No video data received from Hugging Face");
    }

    console.log(`[VIDEO] ✅ Video generated successfully`);

    // Convert blob to base64 for storage
    const buffer = await video.arrayBuffer();
    const videoBase64 = Buffer.from(buffer).toString("base64");

    return {
      success: true,
      videoData: videoBase64,
      videoBlob: video,
      provider: "huggingface",
      model: "Wan-AI/Wan2.2-T2V-A14B",
    };
  } catch (error) {
    console.error("[VIDEO] Hugging Face generation error:", error);
    return {
      success: false,
      error: error.message,
      provider: "huggingface",
    };
  }
};

/**
 * Main video generation function with fallback support
 * @param {string} prompt - Text description for video
 * @param {string} style - Visual style (default: realistic)
 * @returns {Promise<{success: boolean, videoData?: string, provider: string, error?: string}>}
 */
const generateVideo = async (prompt, style = "realistic") => {
  try {
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      throw new Error("Video prompt must be a non-empty string");
    }

    console.log(`[VIDEO] Starting video generation with prompt: "${prompt}"`);

    // Try Hugging Face
    const hfResult = await generateVideoWithHuggingFace(prompt, style);

    if (hfResult.success) {
      return hfResult;
    }

    // All providers failed
    throw new Error("Video generation failed: " + hfResult.error);
  } catch (error) {
    console.error("[VIDEO] Video generation failed:", error);
    return {
      success: false,
      error: error.message,
      provider: "none",
    };
  }
};

/**
 * Save video to Cloudinary (using Cloudinary SDK)
 * Note: Actual upload is done in the controller to avoid tight coupling
 * This function converts video blob to base64 for API transfer
 * @param {Buffer|Blob} videoBuffer - Video buffer/blob
 * @returns {Promise<{success: boolean, base64?: string, mimeType?: string, error?: string}>}
 */
const prepareVideoForUpload = async (videoBuffer) => {
  try {
    if (!videoBuffer) {
      throw new Error("Video buffer is required");
    }

    // Detect MIME type (Wan-AI typically outputs mp4)
    const mimeType = "video/mp4";

    // Convert to base64 if it's a buffer
    let base64Data;
    if (Buffer.isBuffer(videoBuffer)) {
      base64Data = videoBuffer.toString("base64");
    } else if (videoBuffer instanceof Blob) {
      // Convert Blob to Buffer then to base64
      const arrayBuffer = await videoBuffer.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString("base64");
    } else {
      throw new Error("Invalid video buffer format");
    }

    return {
      success: true,
      base64: base64Data,
      mimeType: mimeType,
      dataUri: `data:${mimeType};base64,${base64Data}`,
    };
  } catch (error) {
    console.error("[VIDEO] Error preparing video for upload:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Generate filename for video
 * @param {string} extension - File extension (default: mp4)
 * @returns {string} Generated filename
 */
const generateVideoFilename = (extension = "mp4") => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  return `video_${timestamp}_${random}.${extension}`;
};

/**
 * Batch generate videos from multiple prompts
 * @param {Array<{prompt: string, style?: string}>} items
 * @returns {Promise<Array>} Array of generation results
 */
const batchGenerateVideos = async (items) => {
  try {
    const results = await Promise.all(
      items.map(({ prompt, style = "realistic" }) =>
        generateVideo(prompt, style),
      ),
    );
    return results;
  } catch (error) {
    console.error("[VIDEO] Batch video generation error:", error);
    return [];
  }
};

module.exports = {
  // Image Generation Functions
  generateImage,
  generateImageWithGemini,
  generateImageWithOpenAI,
  generateImageWithHuggingFace,
  blendImages,
  blendImagesWithHuggingFace,
  blendImagesWithOpenAI,
  generateLogo,
  generateLogoWithGemini,
  generateLogoWithOpenAI,
  generateLogoWithHuggingFace,

  // Video Generation Functions (NEW)
  generateVideo,
  generateVideoWithHuggingFace,
  prepareVideoForUpload,
  generateVideoFilename,
  batchGenerateVideos,

  // Prompt Enhancement (v2.0 Production Grade)
  enhancePrompt,
  enhanceLogoPrompt,

  // Prompt Engineer Constants & Utilities
  STYLE_PROFILES,
  SUBJECT_INTELLIGENCE,
  MOOD_KEYWORDS,
  UNIVERSAL_QUALITY,
  UNIVERSAL_NEGATIVES,
  getSupportedStyles,
  batchEnhance,

  // Utility Functions
  saveImageToPublic,
  generateFilename,
};
