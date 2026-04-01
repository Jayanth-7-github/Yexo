import { create } from "zustand";

export const useCallStore = create((set) => ({
  callState: "idle", // idle | calling | ringing | in-call | ended
  callInfo: null, // { remoteUserId, remoteName, isVideo }
  setCallState: (callState) => set({ callState }),
  setCallInfo: (callInfo) => set({ callInfo }),
  resetCall: () => set({ callState: "idle", callInfo: null }),
}));
