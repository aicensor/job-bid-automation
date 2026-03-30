import { getSheetsClient, getSheetId, getSheetName, isConfigured } from './client';
import type { TailorLogEntry } from '@/lib/bidman-log';

// ============================================================================
// Google Sheets Sync — Push bidman log entries to remote sheet
// ============================================================================

let headerChecked = false;

/**
 * Ensure the sheet has the correct header row.
 * Only runs once per server lifecycle.
 */
async function ensureHeader() {
  if (headerChecked) return;

  const sheets = getSheetsClient();
  const sheetId = getSheetId();
  const sheetName = getSheetName();
  if (!sheets || !sheetId) return;

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1:H1`,
    });

    const firstRow = res.data.values?.[0];
    if (!firstRow || firstRow.length === 0) {
      // Sheet is empty — write header
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1:H1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['No', 'Date', 'Job Title', 'Main Tech Stacks', 'Company Name', 'Industry', 'Job Link', 'Bidder']],
        },
      });
      console.log('[google-sheets] Header row created');
    }

    headerChecked = true;
  } catch (error) {
    console.warn('[google-sheets] Failed to check/create header:', error instanceof Error ? error.message : error);
  }
}

/**
 * Push a single log entry to Google Sheets.
 * Non-blocking: errors are logged but don't throw.
 */
export async function pushLogEntry(entry: TailorLogEntry): Promise<boolean> {
  if (!isConfigured()) {
    console.warn('[google-sheets] Not configured, skipping sync');
    return false;
  }

  const sheets = getSheetsClient();
  const sheetId = getSheetId();
  const sheetName = getSheetName();
  if (!sheets || !sheetId) return false;

  try {
    await ensureHeader();

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:H`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          entry.no,
          entry.date,
          entry.jobTitle,
          entry.mainTechStacks,
          entry.companyName,
          entry.industry,
          entry.jobLink,
          entry.bidder,
        ]],
      },
    });

    console.log(`[google-sheets] Pushed log entry #${entry.no}: ${entry.jobTitle} at ${entry.companyName}`);
    return true;
  } catch (error) {
    console.error('[google-sheets] Failed to push entry:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Sync all local log entries to Google Sheets (full re-sync).
 * Overwrites all data rows, preserving the header.
 */
export async function syncAllEntries(entries: TailorLogEntry[]): Promise<boolean> {
  if (!isConfigured()) return false;

  const sheets = getSheetsClient();
  const sheetId = getSheetId();
  const sheetName = getSheetName();
  if (!sheets || !sheetId) return false;

  try {
    // Clear existing data (keep header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${sheetName}!A2:H`,
    });

    if (entries.length === 0) return true;

    // Write all entries
    const rows = entries.map((e) => [
      e.no,
      e.date,
      e.jobTitle,
      e.mainTechStacks,
      e.companyName,
      e.industry,
      e.jobLink,
      e.bidder,
    ]);

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A2:H`,
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });

    console.log(`[google-sheets] Synced ${entries.length} entries`);
    return true;
  } catch (error) {
    console.error('[google-sheets] Full sync failed:', error instanceof Error ? error.message : error);
    return false;
  }
}
