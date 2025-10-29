const Image = require('../models/Image');
const { generateImage, blendImages, generateLogo } = require('../services/aiService');
const cloudinary = require('../config/cloudinary');
const { consumeCredits } = require('../services/creditService');

// Generate image from prompt and style
const generateImageFromPrompt = async (req, res) => {
  try {
    const { prompt, style } = req.body;

    // Validation
    if (!prompt || !style) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both prompt and style'
      });
    }

    if (prompt.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Prompt cannot exceed 1000 characters'
      });
    }

    // Generate image with AI first
    const aiResult = await generateImage(prompt, style);

    if (!aiResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate image',
        error: aiResult.error
      });
    }

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      `data:image/png;base64,${aiResult.imageData}`,
      {
        folder: 'ai-generated-images',
        resource_type: 'image',
        public_id: `img_${Date.now()}_${Math.floor(Math.random() * 1000000)}`
      }
    );

    // Create database record with Cloudinary URL
    const imageRecord = await Image.create({
      prompt: prompt.trim(),
      style: style.toLowerCase().trim(),
      imagePath: null, // No local file path
      imageUrl: uploadResult.secure_url, // Cloudinary URL
      aiProvider: aiResult.provider,
      status: 'completed',
      userId: req.user?.id,
      metadata: {
        format: 'png',
        width: 1024,
        height: 1024,
        storageType: 'cloudinary',
        cloudinaryId: uploadResult.public_id
      }
    });

    // Consume credits after successful generation and database save
    try {
      await consumeCredits(req.user.id, 1, 'image_generation', imageRecord._id);
    } catch (creditError) {
      console.error('Credit consumption error:', creditError);
      // Note: Image was generated and saved but credit consumption failed
      // You might want to handle this case differently
    }

    res.status(201).json({
      success: true,
      message: 'Image generated successfully',
      data: {
        id: imageRecord._id,
        prompt: imageRecord.prompt,
        style: imageRecord.style,
        imageUrl: imageRecord.imageUrl,
        aiProvider: imageRecord.aiProvider,
        createdAt: imageRecord.createdAt
      }
    });

  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get image by ID
const getImageById = async (req, res) => {
  try {
    const { id } = req.params;

    const image = await Image.findById(id);
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: image._id,
        prompt: image.prompt,
        style: image.style,
        imageUrl: image.imageUrl,
        aiProvider: image.aiProvider,
        status: image.status,
        createdAt: image.createdAt
      }
    });

  } catch (error) {
    console.error('Get image error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user's images (if user is authenticated)
const getUserImages = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 10 } = req.query;

    const query = userId ? { userId } : {};
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const images = await Image.find(query)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .select('prompt style imageUrl aiProvider status createdAt');

    const total = await Image.countDocuments(query);

    res.status(200).json({
      success: true,
      data: images,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      }
    });

  } catch (error) {
    console.error('Get user images error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Blend multiple images with AI
const blendImagesFromUpload = async (req, res) => {
  try {
    const { prompt, style } = req.body;
    const images = req.files;

    // Validation
    if (!prompt || !style) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both prompt and style'
      });
    }

    if (!images || images.length < 2 || images.length > 4) {
      return res.status(400).json({
        success: false,
        message: 'Please upload between 2-4 images for blending'
      });
    }

    if (prompt.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Prompt cannot exceed 1000 characters'
      });
    }

    console.log(`Blending ${images.length} images with prompt: "${prompt}" and style: "${style}"`);

    // Blend images with AI
    const aiResult = await blendImages(images, prompt, style);

    if (!aiResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to blend images',
        error: aiResult.error
      });
    }

    // Upload blended image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      `data:image/png;base64,${aiResult.imageData}`,
      {
        folder: 'ai-blended-images',
        resource_type: 'image',
        public_id: `blend_${Date.now()}_${Math.floor(Math.random() * 1000000)}`
      }
    );

    // Create database record for blended image
    const imageRecord = await Image.create({
      prompt: prompt.trim(),
      style: style.toLowerCase().trim(),
      imagePath: null, // No local file path
      imageUrl: uploadResult.secure_url, // Cloudinary URL
      aiProvider: aiResult.provider,
      status: 'completed',
      imageType: 'blended', // Mark as blended image
      userId: req.user?.id,
      metadata: {
        format: 'png',
        width: 1024,
        height: 1024,
        storageType: 'cloudinary',
        cloudinaryId: uploadResult.public_id,
        sourceImages: images.length,
        blendedImages: aiResult.blendedImages || images.length
      }
    });

    // Consume credits after successful blending and database save
    try {
      await consumeCredits(req.user.id, 1, 'image_blending', imageRecord._id);
    } catch (creditError) {
      console.error('Credit consumption error:', creditError);
    }

    res.status(201).json({
      success: true,
      message: 'Images blended successfully',
      data: {
        id: imageRecord._id,
        prompt: imageRecord.prompt,
        style: imageRecord.style,
        imageUrl: imageRecord.imageUrl,
        aiProvider: imageRecord.aiProvider,
        imageType: imageRecord.imageType,
        sourceImages: images.length,
        createdAt: imageRecord.createdAt
      }
    });

  } catch (error) {
    console.error('Image blending error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get recent logos (latest 5)
const getRecentLogos = async (req, res) => {
  try {
    // Query for the 5 most recent logos
    const recentLogos = await Image.find({ 
      imageType: 'logo',
      status: 'completed'
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('prompt style imageUrl aiProvider createdAt metadata.logoStyle');

    res.status(200).json({
      success: true,
      message: 'Recent logos fetched successfully',
      data: recentLogos.map(logo => ({
        id: logo._id,
        prompt: logo.prompt,
        style: logo.style,
        imageUrl: logo.imageUrl,
        aiProvider: logo.aiProvider,
        logoStyle: logo.metadata?.logoStyle || logo.style,
        createdAt: logo.createdAt
      })),
      count: recentLogos.length
    });

  } catch (error) {
    console.error('Get recent logos error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Generate logo/icon from prompt and style
const generateLogoFromPrompt = async (req, res) => {
  try {
    const { prompt, style } = req.body;

    // Validation
    if (!prompt || !style) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both prompt and style'
      });
    }

    if (prompt.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Logo prompt cannot exceed 500 characters'
      });
    }

    // Validate logo style
    const validLogoStyles = [
      'modern', 'vintage', 'minimalist', 'corporate', 'creative', 
      'tech', 'luxury', 'playful', 'bold', 'elegant', 'geometric', 'organic'
    ];

    if (!validLogoStyles.includes(style.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid logo style. Valid styles: ${validLogoStyles.join(', ')}`
      });
    }

    console.log(`Generating logo with prompt: "${prompt}" and style: "${style}"`);

    // Generate logo with AI
    const aiResult = await generateLogo(prompt, style);

    if (!aiResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate logo',
        error: aiResult.error
      });
    }

    // Upload logo to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      `data:image/png;base64,${aiResult.imageData}`,
      {
        folder: 'ai-logos',
        resource_type: 'image',
        public_id: `logo_${Date.now()}_${Math.floor(Math.random() * 1000000)}`
      }
    );

    // Create database record for logo
    const logoRecord = await Image.create({
      prompt: prompt.trim(),
      style: style.toLowerCase().trim(),
      imagePath: null, // No local file path
      imageUrl: uploadResult.secure_url, // Cloudinary URL
      aiProvider: aiResult.provider,
      status: 'completed',
      imageType: 'logo', // Mark as logo
      userId: req.user?.id,
      metadata: {
        format: 'png',
        width: 1024,
        height: 1024,
        storageType: 'cloudinary',
        cloudinaryId: uploadResult.public_id,
        logoStyle: style.toLowerCase(),
        model: aiResult.model || 'default'
      }
    });

    // Consume credits after successful logo generation and database save
    try {
      await consumeCredits(req.user.id, 1, 'logo_generation', logoRecord._id);
    } catch (creditError) {
      console.error('Credit consumption error:', creditError);
    }

    res.status(201).json({
      success: true,
      message: 'Logo generated successfully',
      data: {
        id: logoRecord._id,
        prompt: logoRecord.prompt,
        style: logoRecord.style,
        imageUrl: logoRecord.imageUrl,
        aiProvider: logoRecord.aiProvider,
        imageType: logoRecord.imageType,
        logoStyle: style.toLowerCase(),
        createdAt: logoRecord.createdAt
      }
    });

  } catch (error) {
    console.error('Logo generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  generateImageFromPrompt,
  blendImagesFromUpload,
  generateLogoFromPrompt,
  getImageById,
  getUserImages,
  getRecentLogos
};
