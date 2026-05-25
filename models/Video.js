const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: [true, "Prompt is required"],
    trim: true,
    maxlength: [1000, "Prompt cannot exceed 1000 characters"],
  },
  style: {
    type: String,
    required: [true, "Style is required"],
    trim: true,
    lowercase: true,
  },
  videoPath: {
    type: String,
    required: false, // Will be set after video generation
    default: "",
  },
  videoUrl: {
    type: String,
    required: false, // Will be set after video generation (Cloudinary URL)
    default: "",
  },
  aiProvider: {
    type: String,
    required: [true, "AI provider is required"],
    enum: ["huggingface", "pending"],
    default: "pending",
  },
  videoModel: {
    type: String,
    required: [true, "Video model is required"],
    enum: ["Wan-AI/Wan2.2-T2V-A14B", "other"],
    default: "Wan-AI/Wan2.2-T2V-A14B",
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // Optional for now
  },
  metadata: {
    duration: Number, // Video duration in seconds
    format: String, // File format (mp4, webm, etc)
    fileSize: Number,
    width: Number,
    height: Number,
    fps: Number,
    storageType: {
      type: String,
      enum: ["file", "cloudinary"],
      default: "cloudinary",
    },
    cloudinaryId: String, // Store Cloudinary public_id for deletion
  },
  status: {
    type: String,
    enum: ["generating", "processing", "uploading", "completed", "failed"],
    default: "generating",
  },
  isLiked: {
    type: Boolean,
    default: false,
  },
  likes: {
    type: Number,
    default: 0,
  },
  downloads: {
    type: Number,
    default: 0,
  },
  errorMessage: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for better query performance
videoSchema.index({ userId: 1, createdAt: -1 });
videoSchema.index({ status: 1 });
videoSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Video", videoSchema);
