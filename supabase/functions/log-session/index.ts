// Logs a completed lab session to a Google Sheet using a service account.
// Public endpoint (called from the website when a session ends).
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SHEET_ID = Deno.env.get("GOOGLE_SHEET_ID")!;
const SA_EMAIL = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL")!;
const SA_KEY_RAW = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")!;

// --- helpers ---------------------------------------------------------------

function pemToArrayBuffer(pem: string): ArrayBuffer {
  let cleaned = pem.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
  cleaned = cleaned
    .replace(/\\n/g, "")
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  // Diagnostic: log info about the cleaned key (length + first/last chars only).
  console.log(`PEM cleaned length=${cleaned.length}, head="${cleaned.slice(0, 12)}", tail="${cleaned.slice(-12)}"`);
  const bin = atob(cleaned);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken(): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: SA_EMAIL,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(SA_KEY_RAW),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function sheetsGet(path: string, token: string) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${path}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Sheets GET ${path} failed: ${JSON.stringify(data)}`);
  return data;
}

async function sheetsPost(path: string, token: string, body: unknown) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Sheets POST ${path} failed: ${JSON.stringify(data)}`);
  return data;
}

function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

// --- handler ---------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { rollNo, tableNumber, startTime, endTime } = await req.json();
    if (!rollNo || !tableNumber || !startTime || !endTime) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const dateStr = fmtDate(end);
    const timestampCell = `${dateStr} ${fmtTime(start)} → ${fmtTime(end)}`;

    const token = await getAccessToken();

    // Find last non-empty row in column A
    const existing = await sheetsGet(
      "/values/A:A?majorDimension=COLUMNS",
      token,
    );
    const colA: string[] = existing.values?.[0] ?? [];
    const lastRowIdx = colA.length; // 0 = empty (only consider header at row 1)
    const lastVal = colA[lastRowIdx - 1] ?? "";

    // Determine if we need a blank separator row.
    // Rule: if the previous row's date (parsed from timestamp cell column C) differs from today, leave one blank row.
    let needBlank = false;
    if (lastRowIdx >= 2) {
      const lastTs = await sheetsGet(
        `/values/C${lastRowIdx}`,
        token,
      );
      const lastTsVal: string = lastTs.values?.[0]?.[0] ?? "";
      const lastDate = lastTsVal.slice(0, 10); // dd-mm-yyyy
      if (lastDate && lastDate !== dateStr) needBlank = true;
    }

    const rows: (string | number)[][] = [];
    if (needBlank) rows.push(["", "", ""]);
    rows.push([rollNo, tableNumber, timestampCell]);

    await sheetsPost(
      "/values/A1:C1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS",
      token,
      { values: rows },
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("log-session error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
