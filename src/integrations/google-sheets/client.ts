import { google, sheets_v4 } from 'googleapis';
import fs from 'fs';
import path from 'path';

// ============================================================================
// Google Sheets Client — Manages auth and sheet operations
// Supports: Service Account (write) or API Key (read-only)
// ============================================================================

let sheetsClient: sheets_v4.Sheets | null = null;

function getAuth() {
  // Priority 1: Service Account JSON key file
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (keyPath) {
    const fullPath = path.isAbsolute(keyPath) ? keyPath : path.join(process.cwd(), keyPath);
    if (fs.existsSync(fullPath)) {
      const auth = new google.auth.GoogleAuth({
        keyFile: fullPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      return auth;
    }
  }

  // Priority 2: Service Account JSON inline (env var)
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (keyJson) {
    try {
      const credentials = JSON.parse(keyJson);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      return auth;
    } catch {
      console.warn('[google-sheets] Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY');
    }
  }

  // Priority 3: API Key (read-only)
  const apiKey = process.env.GOOGLE_API_KEY;
  if (apiKey) {
    return apiKey;
  }

  return null;
}

export function getSheetsClient(): sheets_v4.Sheets | null {
  if (sheetsClient) return sheetsClient;

  const auth = getAuth();
  if (!auth) {
    console.warn('[google-sheets] No auth configured. Set GOOGLE_SERVICE_ACCOUNT_KEY_PATH, GOOGLE_SERVICE_ACCOUNT_KEY, or GOOGLE_API_KEY');
    return null;
  }

  if (typeof auth === 'string') {
    // API key
    sheetsClient = google.sheets({ version: 'v4', auth });
  } else {
    // Service Account
    sheetsClient = google.sheets({ version: 'v4', auth });
  }

  return sheetsClient;
}

export function getSheetId(): string | null {
  return process.env.GOOGLE_SHEET_ID || null;
}

export function getSheetName(): string {
  return process.env.GOOGLE_SHEET_NAME || 'TailorLog';
}

/**
 * Check if Google Sheets integration is configured
 */
export function isConfigured(): boolean {
  return !!(getAuth() && getSheetId());
}
