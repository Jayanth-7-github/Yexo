import { http } from "./http";

export async function getHealth() {
  const res = await http.get("/api/health");
  return res.data;
}
