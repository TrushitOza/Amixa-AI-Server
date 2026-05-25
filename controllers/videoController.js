const Video = require("../models/Video");
const { generateVideo } = require("../services/aiService");
const cloudinary = require("../config/cloudinary");
const { consumeCredits } = require("../services/creditService");

/**
 * Generate video from prompt and style
 * @route POST /api/videos/generate
 * @access Private (requires authentication & credits)
 */
const generateVideoFromPrompt = async (req, res) => {
  try {
    const { prompt, style = "realistic" } = req.body;

    // Validation
    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: "Please provide a prompt",
      });
    }

    if (prompt.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Prompt cannot exceed 1000 characters",
      });
    }

    // Create initial database record with generating status
    const videoRecord = await Video.create({
      prompt: prompt.trim(),
      style: style.toLowerCase().trim() || "realistic",
      status: "generating",
      userId: req.user?.id,
      metadata: {
        storageType: "cloudinary",
      },
    });

    // Generate video with AI (in background would be better, but for now synchronously)
    const aiResult = await generateVideo(prompt, style);

    if (!aiResult.success) {
      // Update record with error status
      videoRecord.status = "failed";
      videoRecord.errorMessage = aiResult.error;
      await videoRecord.save();

      return res.status(500).json({
        success: false,
        message: "Failed to generate video",
        error: aiResult.error,
      });
    }

    try {
      // Update status to processing
      videoRecord.status = "uploading";
      await videoRecord.save();

      // Prepare video data URI for Cloudinary upload
      const videoDataUri = `data:video/mp4;base64,${aiResult.videoData}`;

      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(videoDataUri, {
        folder: "ai-generated-videos",
        resource_type: "video",
        public_id: `video_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
        timeout: 120000, // 2 minutes timeout for video upload
      });

      // Update record with Cloudinary URL and metadata
      videoRecord.videoUrl = uploadResult.secure_url;
      videoRecord.status = "completed";
      videoRecord.aiProvider = aiResult.provider;
      videoRecord.metadata = {
        ...videoRecord.metadata,
        format: "mp4",
        cloudinaryId: uploadResult.public_id,
        fileSize: uploadResult.bytes,
        duration: uploadResult.duration || null,
      };

      await videoRecord.save();

      // Consume credits after successful generation and database save
      try {
        await consumeCredits(
          req.user.id,
          5,
          "video_generation",
          videoRecord._id,
        );
      } catch (creditError) {
        console.error("Credit consumption error:", creditError);
        // Note: Video was generated and saved but credit consumption failed
      }

      res.status(201).json({
        success: true,
        message: "Video generated successfully",
        data: {
          id: videoRecord._id,
          prompt: videoRecord.prompt,
          style: videoRecord.style,
          videoUrl: videoRecord.videoUrl,
          aiProvider: videoRecord.aiProvider,
          status: videoRecord.status,
          createdAt: videoRecord.createdAt,
        },
      });
    } catch (uploadError) {
      console.error("Video upload error:", uploadError);

      // Update record with error status
      videoRecord.status = "failed";
      videoRecord.errorMessage = `Upload failed: ${uploadError.message}`;
      await videoRecord.save();

      return res.status(500).json({
        success: false,
        message: "Failed to upload video to storage",
        error: uploadError.message,
      });
    }
  } catch (error) {
    console.error("Video generation error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get video by ID
 * @route GET /api/videos/:id
 * @access Public
 */
const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id).populate("userId", "username email");

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    res.json({
      success: true,
      data: video,
    });
  } catch (error) {
    console.error("Get video error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get user's videos (with pagination)
 * @route GET /api/videos
 * @access Private
 */
const getUserVideos = async (req, res) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const videos = await Video.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Video.countDocuments({ userId });

    res.json({
      success: true,
      data: videos,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get user videos error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get recent videos (public)
 * @route GET /api/videos/recent
 * @access Public
 */
const getRecentVideos = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    const videos = await Video.find({ status: "completed" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "username");

    res.json({
      success: true,
      data: videos,
    });
  } catch (error) {
    console.error("Get recent videos error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Delete video by ID
 * @route DELETE /api/videos/:id
 * @access Private
 */
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Check ownership
    if (video.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this video",
      });
    }

    // Delete from Cloudinary if exists
    if (video.metadata?.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(video.metadata.cloudinaryId, {
          resource_type: "video",
        });
      } catch (cloudinaryError) {
        console.error("Cloudinary deletion error:", cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // Delete from database
    await Video.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    console.error("Delete video error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Like/Unlike video
 * @route PATCH /api/videos/:id/like
 * @access Private
 */
const toggleLikeVideo = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Toggle like status
    video.isLiked = !video.isLiked;
    if (video.isLiked) {
      video.likes = (video.likes || 0) + 1;
    } else {
      video.likes = Math.max((video.likes || 0) - 1, 0);
    }

    await video.save();

    res.json({
      success: true,
      message: video.isLiked ? "Video liked" : "Video unliked",
      data: {
        id: video._id,
        isLiked: video.isLiked,
        likes: video.likes,
      },
    });
  } catch (error) {
    console.error("Toggle like error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get video generation status
 * @route GET /api/videos/:id/status
 * @access Private
 */
const getVideoStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id, "status errorMessage videoUrl");

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    res.json({
      success: true,
      data: {
        id: video._id,
        status: video.status,
        videoUrl: video.videoUrl,
        errorMessage: video.errorMessage,
      },
    });
  } catch (error) {
    console.error("Get video status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  generateVideoFromPrompt,
  getVideoById,
  getUserVideos,
  getRecentVideos,
  deleteVideo,
  toggleLikeVideo,
  getVideoStatus,
};
