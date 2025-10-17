const logger = (req, res, next) => {
    // Clone the request body to avoid modifying the original
    const requestBody = JSON.parse(JSON.stringify(req.body || {}));
  
    console.log(
      `[DEBUG] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`
    );
    console.log("[DEBUG] Request Headers:", JSON.stringify(req.headers, null, 2));
    console.log("[DEBUG] Request Body:", JSON.stringify(requestBody, null, 2));
  
    // Capture the original response methods
    const originalSend = res.send;
    const originalJson = res.json;
  
    // Override response methods to log the response
    res.send = function (body) {
      console.log(`[DEBUG] Response (${res.statusCode}):`, body);
      return originalSend.apply(this, arguments);
    };
  
    res.json = function (body) {
      console.log(
        `[DEBUG] Response JSON (${res.statusCode}):`,
        JSON.stringify(body, null, 2)
      );
      return originalJson.apply(this, arguments);
    };
  
    next();
  };
  module.exports = logger;