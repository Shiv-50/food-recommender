import { v4 as uuid } from "uuid";

export function getSessionId(): string {
  let sid = localStorage.getItem("sid");
  if (!sid) {
    sid = uuid();
    localStorage.setItem("sid", sid);
  }
  return sid;
}

export function resetSession() {
  localStorage.removeItem("sid");
}