const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// Initialize AI clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Prompt Engineering Function
const enhancePrompt = (userPrompt, style) => {
  // Base quality enhancers
  const qualityTerms = "high quality, detailed, professional, sharp focus, well-lit";
  
  // Style-specific enhancements
  const styleEnhancements = {
    'realistic': 'photorealistic, ultra-realistic, 8k resolution, professional photography',
    'cartoon': 'cartoon style, animated, colorful, clean lines, digital art',
    'anime': 'anime style, manga, japanese animation, vibrant colors, detailed',
    'oil painting': 'oil painting, classical art, brush strokes, artistic, painted texture',
    'watercolor': 'watercolor painting, soft colors, flowing, artistic, painted',
    'sketch': 'pencil sketch, hand-drawn, artistic lines, black and white',
    'digital art': 'digital art, concept art, detailed, modern, clean',
    'fantasy': 'fantasy art, magical, mystical, detailed, epic, cinematic',
    'cyberpunk': 'cyberpunk style, neon lights, futuristic, dark, atmospheric',
    'vintage': 'vintage style, retro, classic, aged, nostalgic',
    'minimalist': 'minimalist, clean, simple, modern, elegant',
    'abstract': 'abstract art, artistic, creative, unique composition'
  };
  
  // Negative prompts to avoid common issues
  const negativePrompts = "blurry, low quality, distorted, ugly, bad anatomy, extra limbs, text, watermark";
  
  // Get style enhancement or default
  const styleEnhancement = styleEnhancements[style.toLowerCase()] || styleEnhancements['realistic'];
  
  // Construct enhanced prompt
  const enhancedPrompt = `${userPrompt}, ${styleEnhancement}, ${qualityTerms}. Negative prompt: ${negativePrompts}`;
  
  return enhancedPrompt;
};

// Logo/Icon Specific Prompt Engineering
const enhanceLogoPrompt = (userPrompt, style) => {
  // Logo-specific quality terms
  const logoQualityTerms = "vector art, clean design, professional logo, scalable, high contrast, clear lines, brand identity";
  
  // Logo style-specific enhancements
  const logoStyleEnhancements = {
    'modern': 'modern logo design, minimalist, clean typography, contemporary, sleek',
    'vintage': 'vintage logo, retro design, classic typography, aged look, traditional',
    'minimalist': 'minimalist logo, simple design, clean lines, negative space, elegant',
    'corporate': 'corporate logo, professional, business identity, trustworthy, clean',
    'creative': 'creative logo, artistic, unique design, innovative, eye-catching',
    'tech': 'tech logo, digital, futuristic, modern technology, innovation',
    'luxury': 'luxury logo, premium design, elegant, sophisticated, high-end',
    'playful': 'playful logo, fun design, colorful, friendly, approachable',
    'bold': 'bold logo design, strong typography, impactful, confident, powerful',
    'elegant': 'elegant logo, refined design, sophisticated, graceful, premium',
    'geometric': 'geometric logo, abstract shapes, mathematical precision, structured',
    'organic': 'organic logo, natural shapes, flowing lines, nature-inspired'
  };
  
  // Logo-specific negative prompts
  const logoNegativePrompts = "blurry, pixelated, low resolution, cluttered, busy design, poor typography, amateur, distorted text, watermark, copyright";
  
  // Get logo style enhancement
  const logoStyleEnhancement = logoStyleEnhancements[style.toLowerCase()] || logoStyleEnhancements['modern'];
  
  // Construct logo-specific enhanced prompt
  const enhancedLogoPrompt = `${userPrompt}, ${logoStyleEnhancement}, ${logoQualityTerms}, transparent background, centered composition. Negative prompt: ${logoNegativePrompts}`;
  
  return enhancedLogoPrompt;
};

// Gemini AI Service (Note: Gemini doesn't generate images directly)
const generateImageWithGemini = async (prompt, style) => {
  try {
    // Gemini doesn't support image generation yet
    // This is a placeholder that will always fail and fallback to other services
    console.log('Gemini image generation not supported, will fallback...');
    
    return {
      success: false,
      error: 'Gemini does not support image generation',
      provider: 'gemini'
    };
  } catch (error) {
    console.error('Gemini generation error:', error);
    return {
      success: false,
      error: error.message,
      provider: 'gemini'
    };
  }
};

// Hugging Face Service (Free Alternative)
const generateImageWithHuggingFace = async (prompt, style) => {
  try {
    // Check if API key exists
    if (!process.env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY === 'your_huggingface_api_key_here') {
      throw new Error('Hugging Face API key not configured');
    }

    console.log('Using Hugging Face API key:', process.env.HUGGINGFACE_API_KEY ? `${process.env.HUGGINGFACE_API_KEY.substring(0, 10)}...` : 'NOT SET');

    const enhancedPrompt = enhancePrompt(prompt, style);
    console.log('Hugging Face enhanced prompt:', enhancedPrompt);
    
    // Try multiple models until one works
    const models = [
      'runwayml/stable-diffusion-v1-5',
      'stabilityai/stable-diffusion-2-1',
      'CompVis/stable-diffusion-v1-4',
      'stabilityai/stable-diffusion-xl-base-1.0'
    ];

    let response;
    let lastError;

    for (const model of models) {
      try {
        console.log(`Trying Hugging Face model: ${model}`);
        response = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: enhancedPrompt,
            options: { wait_for_model: true }
          })
        });

        if (response.ok) {
          console.log(`✅ Success with model: ${model}`);
          break;
        } else {
          const errorText = await response.text();
          console.log(`❌ Model ${model} failed: ${response.status} - ${errorText}`);
          lastError = `${response.status} - ${errorText}`;
        }
      } catch (error) {
        console.log(`❌ Model ${model} error:`, error.message);
        lastError = error.message;
      }
    }

    if (!response || !response.ok) {
      throw new Error(`All Hugging Face models failed. Last error: ${lastError}`);
    }

    // Hugging Face returns image as blob/buffer
    const imageBuffer = await response.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    
    return {
      success: true,
      imageData: imageBase64,
      provider: 'huggingface'
    };
  } catch (error) {
    console.error('Hugging Face generation error:', error);
    return {
      success: false,
      error: error.message,
      provider: 'huggingface'
    };
  }
};

// OpenAI Service (Using Official Library)
const generateImageWithOpenAI = async (prompt, style) => {
  try {
    const enhancedPrompt = enhancePrompt(prompt, style);
    
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json'
    });
    
    return {
      success: true,
      imageData: response.data[0].b64_json,
      provider: 'openai'
    };
  } catch (error) {
    console.error('OpenAI generation error:', error);
    return {
      success: false,
      error: error.message,
      provider: 'openai'
    };
  }
};

// Main generation function with fallback
const generateImage = async (prompt, style) => {
  try {
    // Try Gemini first
    console.log('Attempting image generation with Gemini...');
    const geminiResult = await generateImageWithGemini(prompt, style);
    
    if (geminiResult.success) {
      return geminiResult;
    }
    
    // Fallback to OpenAI
    console.log('Gemini failed, falling back to OpenAI...');
    const openaiResult = await generateImageWithOpenAI(prompt, style);
    
    if (openaiResult.success) {
      return openaiResult;
    }
    
    // Final fallback to Hugging Face (Free)
    console.log('OpenAI failed, falling back to Hugging Face (Free)...');
    const huggingfaceResult = await generateImageWithHuggingFace(prompt, style);
    
    if (huggingfaceResult.success) {
      return huggingfaceResult;
    }
    
    // All providers failed
    throw new Error('All AI providers failed to generate image');
    
  } catch (error) {
    console.error('Image generation failed:', error);
    return {
      success: false,
      error: error.message,
      provider: 'none'
    };
  }
};

// Save image to public folder
const saveImageToPublic = (imageBase64, filename) => {
  try {
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const imagePath = path.join(__dirname, '../public/images/generated', filename);
    
    // Ensure directory exists
    const dir = path.dirname(imagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(imagePath, imageBuffer);
    
    return {
      success: true,
      imagePath: `/images/generated/${filename}`,
      fullPath: imagePath
    };
  } catch (error) {
    console.error('Error saving image:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate unique filename
const generateFilename = (extension = 'png') => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  return `img_${timestamp}_${random}.${extension}`;
};

// Image Blending Service
const blendImages = async (images, prompt, style) => {
  try {
    // Convert uploaded images to base64 for AI processing
    const imageBase64Array = images.map(image => {
      return Buffer.from(image.buffer).toString('base64');
    });

    console.log(`Blending ${images.length} images with prompt: ${prompt}`);

    // Try Hugging Face blending first
    const blendResult = await blendImagesWithHuggingFace(imageBase64Array, prompt, style);
    
    if (blendResult.success) {
      return blendResult;
    }

    // Fallback: Try OpenAI DALL-E with image editing (if available)
    console.log('Hugging Face blending failed, trying OpenAI image editing...');
    const openaiResult = await blendImagesWithOpenAI(imageBase64Array, prompt, style);
    
    if (openaiResult.success) {
      return openaiResult;
    }

    // Final fallback: Use regular generation with enhanced prompt
    console.log('All image-based blending failed, using text-based generation...');
    const fallbackPrompt = `${prompt}, artistic blend of ${images.length} different images, composite artwork, merged elements, fusion of multiple visual elements`;
    
    const fallbackResult = await generateImage(fallbackPrompt, style);
    
    if (fallbackResult.success) {
      return {
        success: true,
        imageData: fallbackResult.imageData,
        provider: fallbackResult.provider,
        blendedImages: images.length,
        method: 'text-based-fallback'
      };
    }

    return {
      success: false,
      error: 'Image blending failed with all providers',
      provider: 'none'
    };

  } catch (error) {
    console.error('Image blending error:', error);
    return {
      success: false,
      error: error.message,
      provider: 'none'
    };
  }
};

// Hugging Face Image Blending with actual image input
const blendImagesWithHuggingFace = async (imageBase64Array, prompt, style) => {
  try {
    // Check if API key exists
    if (!process.env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY === 'your_huggingface_api_key_here') {
      throw new Error('Hugging Face API key not configured');
    }

    const enhancedPrompt = enhancePrompt(prompt, style);
    console.log('Hugging Face blend prompt:', enhancedPrompt);
    console.log(`Processing ${imageBase64Array.length} uploaded images for blending`);
    
    // Use the first image as base for img2img transformation
    const baseImage = imageBase64Array[0];
    
    // Try image-to-image models that support init_image
    const img2imgModels = [
      'runwayml/stable-diffusion-v1-5',
      'stabilityai/stable-diffusion-2-1-base',
      'CompVis/stable-diffusion-v1-4'
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
            negative_prompt: "blurry, bad quality, distorted, ugly, bad anatomy"
          },
          options: {
            wait_for_model: true,
            use_cache: false
          }
        };

        response = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          console.log(`✅ Image-to-image blend success with model: ${model}`);
          break;
        } else {
          const errorText = await response.text();
          console.log(`❌ Img2img model ${model} failed: ${response.status} - ${errorText}`);
          lastError = `${response.status} - ${errorText}`;
        }
      } catch (error) {
        console.log(`❌ Img2img model ${model} error:`, error.message);
        lastError = error.message;
      }
    }

    if (!response || !response.ok) {
      throw new Error(`All Hugging Face img2img models failed. Last error: ${lastError}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    
    return {
      success: true,
      imageData: imageBase64,
      provider: 'huggingface',
      blendedImages: imageBase64Array.length,
      method: 'image-to-image'
    };

  } catch (error) {
    console.error('Hugging Face img2img blend error:', error);
    return {
      success: false,
      error: error.message,
      provider: 'huggingface'
    };
  }
};

// OpenAI Image Blending (DALL-E 2 Image Editing)
const blendImagesWithOpenAI = async (imageBase64Array, prompt, style) => {
  try {
    // Check if API key exists
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key not configured');
    }

    const enhancedPrompt = enhancePrompt(prompt, style);
    console.log('OpenAI blend prompt:', enhancedPrompt);
    console.log(`Processing ${imageBase64Array.length} uploaded images for OpenAI blending`);
    
    // Use the first image as base for editing
    const baseImage = imageBase64Array[0];
    
    // Convert base64 to buffer for OpenAI API
    const imageBuffer = Buffer.from(baseImage, 'base64');
    
    // Create form data for OpenAI API
    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'image.png');
    formData.append('prompt', enhancedPrompt);
    formData.append('n', '1');
    formData.append('size', '1024x1024');
    formData.append('response_format', 'b64_json');

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI blend error:', errorText);
      throw new Error(`OpenAI blend error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (result.data && result.data[0] && result.data[0].b64_json) {
      return {
        success: true,
        imageData: result.data[0].b64_json,
        provider: 'openai',
        blendedImages: imageBase64Array.length,
        method: 'image-editing'
      };
    } else {
      throw new Error('No image data received from OpenAI');
    }

  } catch (error) {
    console.error('OpenAI blend error:', error);
    return {
      success: false,
      error: error.message,
      provider: 'openai'
    };
  }
};

// Logo/Icon Generation Service
const generateLogo = async (prompt, style) => {
  try {
    console.log(`Generating logo with prompt: "${prompt}" and style: "${style}"`);

    // Use the same working generation system but with logo-enhanced prompts
    const logoEnhancedPrompt = enhanceLogoPrompt(prompt, style);
    console.log('Using working image generation system for logo with enhanced prompt');
    
    // Use the existing working generateImage function with logo-specific prompt
    const result = await generateImage(logoEnhancedPrompt, 'digital art');
    
    if (result.success) {
      return {
        success: true,
        imageData: result.imageData,
        provider: result.provider,
        method: 'logo-enhanced-generation'
      };
    }

    throw new Error('Logo generation failed with working system');

  } catch (error) {
    console.error('Logo generation failed:', error);
    return {
      success: false,
      error: error.message,
      provider: 'none'
    };
  }
};

// Gemini Logo Generation (Placeholder)
const generateLogoWithGemini = async (prompt, style) => {
  try {
    console.log('Gemini logo generation not supported, will fallback...');
    return {
      success: false,
      error: 'Gemini does not support logo generation',
      provider: 'gemini'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      provider: 'gemini'
    };
  }
};

// OpenAI Logo Generation
const generateLogoWithOpenAI = async (prompt, style) => {
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key not configured');
    }

    const enhancedPrompt = enhanceLogoPrompt(prompt, style);
    console.log('OpenAI logo prompt:', enhancedPrompt);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
      response_format: "b64_json"
    });

    if (response.data && response.data[0] && response.data[0].b64_json) {
      return {
        success: true,
        imageData: response.data[0].b64_json,
        provider: 'openai',
        model: 'dall-e-3'
      };
    } else {
      throw new Error('No image data received from OpenAI');
    }

  } catch (error) {
    console.error('OpenAI logo generation error:', error);
    return {
      success: false,
      error: error.message,
      provider: 'openai'
    };
  }
};

// Hugging Face Logo Generation
const generateLogoWithHuggingFace = async (prompt, style) => {
  try {
    if (!process.env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY === 'your_huggingface_api_key_here') {
      throw new Error('Hugging Face API key not configured');
    }

    const enhancedPrompt = enhanceLogoPrompt(prompt, style);
    console.log('Hugging Face logo prompt:', enhancedPrompt);

    // Try multiple models for logo generation
    const models = [
      'stabilityai/stable-diffusion-2-1',
      'runwayml/stable-diffusion-v1-5',
      'CompVis/stable-diffusion-v1-4'
    ];

    let response;
    let lastError;

    for (const model of models) {
      try {
        console.log(`Trying Hugging Face logo model: ${model}`);
        response = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: enhancedPrompt,
            parameters: {
              negative_prompt: "blurry, pixelated, low resolution, cluttered, busy design, poor typography",
              num_inference_steps: 30,
              guidance_scale: 8.0
            },
            options: {
              wait_for_model: true,
              use_cache: false
            }
          })
        });

        if (response.ok) {
          console.log(`✅ Logo success with model: ${model}`);
          break;
        } else {
          const errorText = await response.text();
          console.log(`❌ Logo model ${model} failed: ${response.status} - ${errorText}`);
          lastError = `${response.status} - ${errorText}`;
        }
      } catch (error) {
        console.log(`❌ Logo model ${model} error:`, error.message);
        lastError = error.message;
      }
    }

    if (!response || !response.ok) {
      throw new Error(`All Hugging Face logo models failed. Last error: ${lastError}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    
    return {
      success: true,
      imageData: imageBase64,
      provider: 'huggingface'
    };

  } catch (error) {
    console.error('Hugging Face logo generation error:', error);
    return {
      success: false,
      error: error.message,
      provider: 'huggingface'
    };
  }
};

module.exports = {
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
  enhanceLogoPrompt,
  saveImageToPublic,
  generateFilename
};
