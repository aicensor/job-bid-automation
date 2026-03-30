import { google } from 'googleapis';

// ============================================================================
// Setup Script: Create a Google Sheet for Bidman Tailor Log
//
// Usage:
//   Option A (Service Account — recommended for server use):
//     GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./service-account.json npx tsx scripts/setup-google-sheet.ts
//
//   Option B (OAuth — one-time setup, opens browser):
//     npx tsx scripts/setup-google-sheet.ts --oauth
//
// After running, add the printed GOOGLE_SHEET_ID to your .env file.
// ============================================================================

const SHEET_TITLE = 'Bidman Tailor Log';
const TAB_NAME = 'TailorLog';
const HEADERS = ['No', 'Date', 'Job Title', 'Main Tech Stacks', 'Company Name', 'Industry', 'Job Link', 'Bidder'];

async function createWithServiceAccount() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath) {
    console.error('Set GOOGLE_SERVICE_ACCOUNT_KEY_PATH env var to your service account JSON key file.');
    console.error('Example: GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./service-account.json npx tsx scripts/setup-google-sheet.ts');
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  // Create spreadsheet
  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: SHEET_TITLE },
      sheets: [{
        properties: { title: TAB_NAME },
      }],
    },
  });

  const sheetId = res.data.spreadsheetId!;
  console.log(`\nSheet created: ${sheetId}`);
  console.log(`URL: https://docs.google.com/spreadsheets/d/${sheetId}`);

  // Add header row
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${TAB_NAME}!A1:H1`,
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] },
  });

  // Format header row (bold + freeze)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
              },
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor)',
          },
        },
        {
          updateSheetProperties: {
            properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
      ],
    },
  });

  // Make it accessible (share with anyone who has the link)
  await drive.permissions.create({
    fileId: sheetId,
    requestBody: {
      role: 'writer',
      type: 'anyone',
    },
  });

  console.log('\nSheet shared as public (anyone with link can edit).');
  console.log('\nAdd this to your .env file:');
  console.log(`GOOGLE_SHEET_ID=${sheetId}`);
  console.log(`GOOGLE_SHEET_NAME=${TAB_NAME}`);
}

async function main() {
  console.log('Creating Google Sheet for Bidman Tailor Log...\n');
  await createWithServiceAccount();
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  if (err.response?.data) console.error('Details:', JSON.stringify(err.response.data, null, 2));
  if (err.errors) console.error('Errors:', JSON.stringify(err.errors, null, 2));
  process.exit(1);
});
