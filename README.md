# JSON Export Tool (Chrome / Edge Extension)

One-click JSON dump of tables and key/value panels for Mambu and Nucleus tenants with advanced popup data extraction.

## Features

- **Mambu → JSON**: Export standard Mambu table data
- **Nucleus → JSON**: Export Nucleus transaction tables  
- **Nucleus (Include popup) → JSON**: Export Nucleus data including detailed popup information for each row

## Install (developer)

1. Download zip
2. Extract the files
3. Open browser → Extensions → Turn developer mode: On
4. `chrome://extensions` → *Load unpacked* → pick the `mambu-export` folder.

## Usage

### For Mambu
1. Navigate to https://mambu.oaknorth-it.com/, open any account page.
2. Click the extension icon
3. Select **Mambu → JSON** 
4. File `mambu_export.json` downloads.

### For Nucleus
1. Navigate to https://nucleus.oaknorth.co.uk/, open any loan detail page with transactions.
2. Click the extension icon
3. Choose from:
   - **Nucleus → JSON**: Basic table export (`nucleus_export.json`)
   - **Nucleus (Include popup) → JSON**: Enhanced export with popup details (`nucleus_popup_export.json`)

## Nucleus Popup Feature

When using "Nucleus (Include popup) → JSON", the extension will:

1. Parse the main transaction table
2. Automatically click on "View Transaction" icons (👁️) for rows that have them
3. Extract detailed information from each popup dialog:
   - Transaction Reference
   - Loan Transfer Details  
   - Transaction Amounts
   - Principal/Interest Information
   - Application Types
   - Remarks
   - And more...
4. Include this data as `popup_details` field for each corresponding row
5. Automatically close popups and continue processing

## Output Structure

### Basic Export
```json
{
  "nucleus_table_0": [
    {
      "Transaction Ref.": "82952",
      "Transaction Date": "01-05-2021", 
      "Transaction Type": "Transfer In",
      "Transaction Amount": "£5,536,519.30",
      "Created On": "01-05-2021 4:30:59 PM",
      "Created By": "guest"
    }
  ]
}
```

### With Popup Details
```json
{
  "nucleus_table_0": [
    {
      "Transaction Ref.": "82952",
      "Transaction Date": "01-05-2021",
      "Transaction Type": "Transfer In", 
      "Transaction Amount": "£5,536,519.30",
      "Created On": "01-05-2021 4:30:59 PM",
      "Created By": "guest",
      "popup_details": {
        "Transaction Ref.": "82952",
        "Loan Transfer In Date": "01-05-2021",
        "External Loan Id": "1066003688",
        "Transaction Amount": "£5,536,519.30",
        "Blocked Account Amount": "£0.00",
        "Retained Interest Amount": "£0.00",
        "Principal Transferred": "£5,535,592.66",
        "Interest Accrual Transferred": "£926.64",
        "Remarks": "-"
      }
    }
  ]
}
```

## Technical Notes

- Uses Angular Material table selectors for Nucleus
- Implements smart popup detection and data extraction
- Handles timing delays for popup loading
- Automatically closes popups to prevent UI interference
- Fallback mechanisms for different table structures
- Error handling for failed popup interactions