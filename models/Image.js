const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: [true, 'Prompt is required'],
    trim: true,
    maxlength: [1000, 'Prompt cannot exceed 1000 characters']
  },
  style: {
    type: String,
    required: [true, 'Style is required'],
    trim: true,
    lowercase: true
  },
  imagePath: {
    type: String,
    required: false, // Will be set after image generation
    default: ''
  },
  imageUrl: {
    type: String,
    required: false, // Will be set after image generation
    default: ''
  },
  aiProvider: {
    type: String,
    required: [true, 'AI provider is required'],
    enum: ['gemini', 'openai', 'huggingface', 'pending'],
    default: 'pending'
  },
  imageType: {
    type: String,
    required: [true, 'Image type is required'],
    enum: ['generated', 'blended', 'logo'],
    default: 'generated'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for now
  },
  metadata: {
    width: Number,
    height: Number,
    format: String,
    fileSize: Number
  },
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed'],
    default: 'generating'
  },
  isLiked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
imageSchema.index({ userId: 1, createdAt: -1 });
imageSchema.index({ status: 1 });
imageSchema.index({ userId: 1, isLiked: 1 }); // For liked images queries

module.exports = mongoose.model('Image', imageSchema);
