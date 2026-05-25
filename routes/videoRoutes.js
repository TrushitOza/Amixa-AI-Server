const express = require("express");
const {
  generateVideoFromPrompt,
  getVideoById,
  getUserVideos,
  getRecentVideos,
  deleteVideo,
  toggleLikeVideo,
  getVideoStatus,
} = require("../controllers/videoController");
const { protect } = require("../middleware/auth");
const { requireCredits } = require("../services/creditService");

const router = express.Router();

// Public routes (no auth required)
router.get("/recent", getRecentVideos);
router.get("/:id", getVideoById);
router.get("/:id/status", getVideoStatus);

// Protected routes (auth required)
router.use(protect);
router.post("/generate", requireCredits(5), generateVideoFromPrompt);
router.get("/", getUserVideos);
router.delete("/:id", deleteVideo);
router.patch("/:id/like", toggleLikeVideo);

module.exports = router;
