# Mambu → JSON Export (Chrome / Edge Extension)

One-click JSON dump of tables and key/value panels for our Mambu tenant.

## Install (developer)

1. Clone repo.
2. `chrome://extensions` → *Load unpacked* → pick the `mambu-export` folder.
3. Navigate to https://oaknorth.mambu.com, open any account page.
4. Click the blue **Export JSON** icon – file `mambu_export.json` downloads.

## Install (users)

1. Download zip
2. Extract the files
3. Open browser -> Extensions -> Turn developer mode: On
4. Select 'Load Unpacked' -> Select extracted root folder
5. Refresh 'Mambu' and use extenstion by clicking on 'Export JSON'

## Build signed CRX for production

```bash
npm run build         # optional: copy only needed files to /dist
chrome --pack-extension=./dist --pack-extension-key=./cert.pem

