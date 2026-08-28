/**
 * Image Service - Upload and load product images via SOF internal service
 *
 * Upload: POST http://192.168.1.87/createtoken/
 * View Local: http://192.168.1.87/token/{token}
 * View Public: https://file.sof.com.vn/token/{token}
 */
import { url_proxy_upload } from "./url";

// Configuration
const IMAGE_UPLOAD_URL = url_proxy_upload;
const IMAGE_VIEW_URL_LOCAL = process.env.REACT_APP_IMAGE_READ_INTERNAL || "http://localhost/no-image/";
// const IMAGE_VIEW_URL_PUBLIC = "https://file.sof.com.vn/token/";
const SOF_USER_TOKEN = process.env.REACT_APP_SERVICES_AUTH_TOKEN || "SOF2025DEVELOPER";
const MAX_IMAGE_SIZE_MB = 1;

/**
 * Convert File to Base64 string
 * @param {File} file - Image file
 * @returns {Promise<string>} Base64 encoded string
 */
export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file
 * @param {File} file - Image file to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImageFile(file) {
  // Check file type
  if (!file.type.startsWith("image/")) {
    return { valid: false, error: "Chỉ chấp nhận file ảnh (image/*)" };
  }

  // Check file size (max 1MB)
  const maxSizeBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Dung lượng ảnh tối đa ${MAX_IMAGE_SIZE_MB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Upload image to SOF image service
 * @param {string} base64Image - Base64 encoded image data
 * @param {string} existingToken - (Optional) Existing token to update
 * @param {string} userId - (Optional) User ID for tracking
 * @param {string} userToken - (Optional) User authentication token
 * @returns {Promise<{ success: boolean, token?: string, error?: string }>}
 */
export async function uploadImage(
  base64Image,
  existingToken = "",
  userId = "",
  userToken = "",
) {
  try {
    const body = {
      ImgSOF: base64Image,
    };

    // Add optional fields if provided
    if (existingToken) {
      body.TokenSOF = existingToken;
    }
    if (userId) {
      body.SOFUser = userId;
    }
    if (userToken) {
      body.SOFToken = userToken;
    }

    const headers = {
      "Content-Type": "application/json",
      "SOF-User-Token": SOF_USER_TOKEN,
    };

    if (userId) headers["SOFUser"] = userId;
    if (userToken) headers["SOFToken"] = userToken;

    const response = await fetch(IMAGE_UPLOAD_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Assuming API returns { token: "xxx" } or { success: true, token: "xxx" }
    if (data.token) {
      return { success: true, token: data.token };
    } else if (data.TokenSOF) {
      return { success: true, token: data.TokenSOF };
    } else if (data.success && data.data?.token) {
      return { success: true, token: data.data.token };
    }

    return { success: false, error: "Không nhận được token từ server" };
  } catch (error) {
    console.error("Error uploading image:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Upload image file (combines validation, conversion, and upload)
 * @param {File} imageFile - Image file to upload
 * @param {string} existingToken - (Optional) Existing token to update
 * @param {string} userId - (Optional) User ID
 * @returns {Promise<{ success: boolean, token?: string, error?: string }>}
 */
export async function uploadImageFile(
  imageFile,
  existingToken = "",
  userId = "",
) {
  // Validate file
  const validation = validateImageFile(imageFile);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Convert to Base64
  const base64 = await fileToBase64(imageFile);

  // Upload
  return uploadImage(base64, existingToken, userId);
}

/**
 * Get public image URL from token
 * @param {string} token - Image token
 * @returns {string} Full image URL
 */
export function getImageUrl(token) {
  if (!token) return null;

  // Already a full URL?
  if (token.startsWith("http://") || token.startsWith("https://")) {
    return token;
  }

  // Tạm thời dùng mạng nội bộ để load ảnh
  return getImageUrlLocal(token);
}

/**
 * Get local (internal network) image URL from token
 * @param {string} token - Image token
 * @returns {string} Full image URL
 */
export function getImageUrlLocal(token) {
  if (!token) return null;
  return `${IMAGE_VIEW_URL_LOCAL}${token}`;
}

/**
 * Check if a string looks like an image token (not a data URL or file path)
 * @param {string} value - Value to check
 * @returns {boolean}
 */
export function isImageToken(value) {
  if (!value || typeof value !== "string") return false;

  // Not a data URL
  if (value.startsWith("data:")) return false;

  // Not a file path
  if (value.includes("/") || value.includes("\\")) return false;

  // Token is typically alphanumeric plus dashes or underscores
  return /^[a-zA-Z0-9\-_]+$/.test(value);
}
