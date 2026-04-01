// Get file extension
export const getFileExtension = (filename) => {
  if (!filename) return "";
  return filename.split(".").pop().toLowerCase();
};

// Get file type from URI
export const getFileType = (uri) => {
  if (!uri) return "file";

  const extension = getFileExtension(uri);

  if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(extension)) {
    return "image";
  } else if (["mp4", "mov", "avi", "mkv", "webm"].includes(extension)) {
    return "video";
  } else if (["mp3", "wav", "aac", "m4a", "ogg"].includes(extension)) {
    return "audio";
  } else if (
    ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(extension)
  ) {
    return "document";
  }

  return "file";
};

// Get MIME type from extension
export const getMimeType = (extension) => {
  const mimeTypes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    mp4: "video/mp4",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    pdf: "application/pdf",
  };

  return mimeTypes[extension.toLowerCase()] || "application/octet-stream";
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};
