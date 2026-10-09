export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
// http -> ws aur https -> wss
export const WS_URL = API_URL.replace(/^http/, "ws");

const TOKEN_KEY = "signal_token";

// Token memory mein bhi rakhte hain: ek browser ke do tabs mein alag users login ho sakein
// (localStorage sirf refresh ke baad session wapas laane ke liye hai)
let tokenInMemory: string | null | undefined;

export function getToken(): string | null {
  if (tokenInMemory === undefined) tokenInMemory = localStorage.getItem(TOKEN_KEY);
  return tokenInMemory;
}

export function saveToken(token: string | null) {
  tokenInMemory = token;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// FastAPI error ya to string hota hai ya validation errors ki list
function readErrorMessage(data: unknown): string {
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg).replace("Value error, ", "");
  return "Something went wrong. Please try again.";
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
}

// Saari API calls isi function se jaati hain: token header + JSON + error handling ek jagah
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await fetch(API_URL + path, { method: options.method ?? "GET", headers, body });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(response.status, readErrorMessage(data));
  }
  return response.json();
}

// File (photo/attachment) upload karke uska URL wapas milta hai
export function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return api<{ url: string; name: string; content_type: string }>("/api/uploads", { method: "POST", formData });
}

// Backend "/uploads/abc.png" jaisa relative URL deta hai, usko full URL banao
export function fileUrl(url: string): string {
  return url.startsWith("http") ? url : API_URL + url;
}
