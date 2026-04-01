import axios from "./axios";
import { ENDPOINTS } from "../constants/endpoints";
import { Platform } from "react-native";

export const uploadAPI = {
  // Upload file (image, video, audio, document) and send as message
  uploadFile: async (file, messageData, onUploadProgress) => {
    console.log("=== UPLOAD API CALLED ===");
    console.log("File input:", file);
    console.log("Message data:", messageData);
    console.log("Platform:", Platform.OS);

    const formData = new FormData();

    // Add message data fields - ensure all fields are sent
    formData.append("chatId", messageData.chatId || "");
    formData.append("type", messageData.type || "image");
    formData.append(
      "content",
      messageData.content !== undefined ? messageData.content : " "
    ); // Use space instead of empty string

    console.log("FormData fields:");
    console.log("- chatId:", messageData.chatId);
    console.log("- type:", messageData.type);
    console.log(
      "- content:",
      messageData.content !== undefined ? messageData.content : " "
    );

    // Platform-specific file handling
    if (Platform.OS === "web") {
      // For web, convert URI to blob
      console.log("Web: Converting URI to blob");
      const response = await fetch(file.uri);
      const blob = await response.blob();
      console.log("Blob created:", blob.type, blob.size);
      formData.append("file", blob, file.fileName || file.uri.split("/").pop());
    } else {
      // For mobile (iOS/Android)
      console.log("Mobile: Using native file object");
      formData.append("file", {
        uri: file.uri,
        type: file.type || "image/jpeg",
        name: file.fileName || file.uri.split("/").pop(),
      });
    }

    console.log("Posting to:", ENDPOINTS.UPLOAD);

    const response = await axios.post(ENDPOINTS.UPLOAD, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      transformRequest: [
        (data, headers) => {
          // For FormData, we need to let the browser/axios set the Content-Type with boundary
          // Remove the Content-Type so axios can set it properly
          if (Platform.OS === "web") {
            delete headers["Content-Type"];
          }
          return data;
        },
      ],
      timeout: 60000, // 60 seconds for file uploads
      onUploadProgress,
    });

    console.log("Upload response:", response.data);
    return response.data;
  },

  // Upload multiple files
  uploadMultiple: async (files, onUploadProgress) => {
    const formData = new FormData();

    if (Platform.OS === "web") {
      // For web
      for (const file of files) {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        formData.append(
          "files",
          blob,
          file.fileName || file.uri.split("/").pop()
        );
      }
    } else {
      // For mobile
      files.forEach((file) => {
        formData.append("files", {
          uri: file.uri,
          type: file.type || "image/jpeg",
          name: file.fileName || file.uri.split("/").pop(),
        });
      });
    }

    const response = await axios.post(ENDPOINTS.UPLOAD, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      transformRequest: [
        (data, headers) => {
          if (Platform.OS === "web") {
            delete headers["Content-Type"];
          }
          return data;
        },
      ],
      timeout: 60000,
      onUploadProgress,
    });

    return response.data;
  },
};
