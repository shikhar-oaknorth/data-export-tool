# JSON Export Tool (Chrome / Edge Extension)

One-click JSON dump of tables and key/value panels for Mambu and Nucleus tenants with **instant popup capture functionality**.

## Features

- **Mambu → JSON**: Export standard Mambu table data
- **Nucleus → JSON**: Export Nucleus transaction tables  
- **Capture Open Popup**: Instantly extract data from any currently visible popup/modal

## Installation (Developer Mode)

1. Download or clone the repository
2. Extract the files to a folder (e.g., `JSON-export`)
3. Open Chrome/Edge → Navigate to Extensions (`chrome://extensions`)
4. Turn on **Developer mode** (toggle in top right)
5. Click **"Load unpacked"** → Select the `JSON-export` folder
6. Extension should appear in your browser toolbar

## Usage Guide

### 1. Mambu Export
**Purpose**: Extract table data from Mambu loan management system

**Steps**:
1. Navigate to `https://mambu.oaknorth-it.com/`
2. Open any account or loan page with tables
3. Click the extension icon
4. Select **"Export JSON"** under Mambu section
5. File `mambu_export.json` downloads automatically

### 2. Nucleus Export  
**Purpose**: Extract transaction table data from Nucleus platform

**Steps**:
1. Navigate to `https://nucleus.oaknorth.co.uk/`
2. Open any loan detail page with transaction tables
3. Click the extension icon
4. Select **"Export JSON"** under Nucleus section
5. File `nucleus_export.json` downloads automatically

### 3. Capture Open Popup
**Purpose**: Extract data from any currently open popup/modal dialog

**Steps**:
1. Navigate to any supported website
2. **Manually open a popup** (click any "View Details", "👁️" icon, etc.)
3. **While popup is still open**, click the extension icon
4. Select **"Capture Open Popup"**
5. File `popup_capture_export.json` downloads instantly

## Workflow Examples

### Scenario 1: Bulk Table Export
- Use **Mambu** or **Nucleus** export for quick table data extraction
- Perfect for getting overview data or preparing reports

### Scenario 2: Detailed Transaction Analysis
1. Use **Nucleus Export** to get the main transaction table
2. Identify transactions of interest
3. Manually open specific transaction popups
4. Use **Capture Open Popup** to get detailed information for each

## Technical Details

### File Structure
```
mambu-export/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup interface
├── popup.js               # Popup logic and data extraction
├── background.js           # Background script (minimal)
└── src/
    ├── content.js          # Legacy content script (for compatibility)
    └── icon.svg            # Extension icon
```

### Browser Compatibility
- **Chrome**: Full support (Manifest V3)
- **Edge**: Full support (Chromium-based)
- **Firefox**: Not supported (uses Manifest V3)

### Permissions Required
- `scripting`: To inject code into web pages
- `activeTab`: To access current tab content
- `downloads`: To download JSON files
- `host_permissions`: Access to Mambu and Nucleus domains

## Data Extraction Capabilities

### Mambu
- Standard HTML tables with headers
- Key-value pair tables
- Account information panels
- Transaction history tables

### Nucleus  
- Angular Material tables (`mat-table`)
- Transaction grids with sortable columns
- Account detail tables
- Any table with `role="grid"`

## Troubleshooting

### Common Issues

**"No data found to export"**
- Make sure you're on a page with visible tables
- Check that the table has headers and data rows
- Try refreshing the page and attempting again

**"No open popup found"** (Popup Capture)
- Ensure a popup/modal is actually open and visible
- The popup must contain text content to be detected
- Try opening a different popup if the current one isn't detected

**"Download failed"**
- Data will be copied to clipboard as fallback
- Check browser console for detailed error information
- Ensure downloads are allowed for the extension

**Extension not working**
- Verify you're on the correct domain (mambu.oaknorth-it.com or nucleus.oaknorth.co.uk)
- Check that the extension has proper permissions
- Try reloading the extension and refreshing the page

### Debug Information
Check browser console (F12) for detailed logs:
- Extension detects which site you're on
- Shows table detection progress
- Displays extraction statistics
- Reports any errors encountered

## Tips

- Check the console for detailed extraction statistics
- The extension automatically handles different table formats and structures
- For complex popups, navigate to the section you want before capturing

## Output Files

- `mambu_export.json` - Mambu table data
- `nucleus_export.json` - Nucleus transaction table data  
- `popup_capture_export.json` - Data from captured popup/modal

The extension provides the perfect balance of **automated table extraction** and **precise manual popup control** for comprehensive data export capabilities!