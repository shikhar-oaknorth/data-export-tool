# Mambu → JSON Export (Chrome / Edge Extension)

One-click JSON dump of tables and key/value panels for our Mambu tenant.

## Install (developer)

1. Clone repo.
2. `chrome://extensions` → *Load unpacked* → pick the `mambu-export` folder.
3. Navigate to https://YOUR_TENANT.mambu.com, open any account page.
4. Click the blue **Export JSON** icon – file `mambu_export.json` downloads.

## Build signed CRX for production

```bash
npm run build         # optional: copy only needed files to /dist
chrome --pack-extension=./dist --pack-extension-key=./cert.pem
# distribute the .crx and .pem SHA256 to IT for whitelisting
