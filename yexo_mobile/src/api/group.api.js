import axios from "./axios";
import { ENDPOINTS } from "../constants/endpoints";

export const groupAPI = {
  // Create group
  createGroup: async (groupData) => {
    const response = await axios.post(ENDPOINTS.GROUPS, groupData);
    return response.data;
  },

  // Get group by ID
  getGroupById: async (groupId) => {
    const response = await axios.get(ENDPOINTS.GROUP_BY_ID(groupId));
    return response.data;
  },

  // Update group
  updateGroup: async (groupId, groupData) => {
    const response = await axios.put(ENDPOINTS.GROUP_BY_ID(groupId), groupData);
    return response.data;
  },

  // Delete group
  deleteGroup: async (groupId) => {
    const response = await axios.delete(ENDPOINTS.GROUP_BY_ID(groupId));
    return response.data;
  },

  // Add member
  addMember: async (groupId, userId) => {
    const response = await axios.post(ENDPOINTS.ADD_MEMBER(groupId), {
      userId,
    });
    return response.data;
  },

  // Remove member
  removeMember: async (groupId, userId) => {
    const response = await axios.delete(
      ENDPOINTS.REMOVE_MEMBER(groupId, userId)
    );
    return response.data;
  },

  // Leave group
  leaveGroup: async (groupId) => {
    const response = await axios.post(ENDPOINTS.LEAVE_GROUP(groupId));
    return response.data;
  },
};
