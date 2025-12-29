import { http } from "./http";

export async function createGroup({ name, description, avatarUrl, memberIds }) {
  const res = await http.post("/api/groups", {
    name,
    description: description || undefined,
    avatarUrl: avatarUrl || undefined,
    memberIds: Array.isArray(memberIds) ? memberIds : [],
  });
  return res.data; // { success, message, data: { group, chat } }
}

export async function getGroupById(groupId) {
  const res = await http.get(`/api/groups/${groupId}`);
  return res.data; // { success, message, data: Group }
}

export async function updateGroup(groupId, updates = {}) {
  const res = await http.patch(`/api/groups/${groupId}`, updates);
  return res.data; // { success, message, data: Group }
}

export async function addGroupMembers(groupId, memberIds = []) {
  const res = await http.post(`/api/groups/${groupId}/members`, {
    memberIds: Array.isArray(memberIds) ? memberIds.filter(Boolean) : [],
  });
  return res.data; // { success, message, data: Group }
}

export async function removeGroupMember(groupId, memberId) {
  const res = await http.delete(`/api/groups/${groupId}/members/${memberId}`);
  return res.data; // { success, message, data: Group }
}

export async function leaveGroup(groupId) {
  const res = await http.post(`/api/groups/${groupId}/leave`);
  return res.data; // { success, message, data }
}

export async function deleteGroup(groupId) {
  const res = await http.delete(`/api/groups/${groupId}`);
  return res.data; // { success, message, data }
}
