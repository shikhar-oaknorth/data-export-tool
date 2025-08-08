(function(){
  'use strict';
  
  try {
    // Get the action passed from popup (default to 'mambu' for backward compatibility)
    const action = window.exportAction || 'mambu';
    
    // Determine which site we're on
    const currentUrl = window.location.href;
    const isMambu = currentUrl.includes('mambu.oaknorth-it.com');
    const isNucleus = currentUrl.includes('nucleus.oaknorth.co.uk');
    
    let result = {};

    // Utility functions
    function isEmptyVal(v) { 
      return v == null || String(v).trim() === ''; 
    }
    
    function isEmptyRow(row) { 
      return Object.values(row).every(isEmptyVal); 
    }
    
    // Sleep function for waiting
    function sleep(ms) { 
      return new Promise(resolve => setTimeout(resolve, ms)); 
    }

    // Extract popup data from Nucleus transaction popup
    function extractNucleusPopupData() {
      const popupData = {};
      
      try {
        // Find the dialog content
        const dialogContent = document.querySelector('.mat-dialog-content');
        if (!dialogContent) return popupData;
        
        // Extract grid data
        const gridTiles = dialogContent.querySelectorAll('mat-grid-tile');
        gridTiles.forEach(tile => {
          const figure = tile.querySelector('figure');
          if (figure) {
            const strong = figure.querySelector('strong');
            if (strong) {
              const label = strong.textContent.trim().replace(':', '').trim();
              const value = figure.textContent.replace(strong.textContent, '').trim();
              if (label && value && value !== '-') {
                popupData[label] = value;
              }
            }
          }
        });
        
        // Extract remarks
        const remarksElement = dialogContent.querySelector('p strong.grey-heading');
        if (remarksElement && remarksElement.textContent.includes('Remarks')) {
          const remarksValue = remarksElement.parentElement.textContent.replace('Remarks :', '').trim();
          if (remarksValue && remarksValue !== '-') {
            popupData['Remarks'] = remarksValue;
          }
        }
      } catch (error) {
        console.error('Error extracting popup data:', error);
      }
      
      return popupData;
    }

    // Close any open popup/dialog
    function closePopup() {
      try {
        // Try multiple ways to close popups
        const closeButtons = document.querySelectorAll('[mat-dialog-close], .mat-dialog-close, .close-button, button[aria-label="Close"]');
        let closed = false;
        
        closeButtons.forEach(btn => {
          if (btn.offsetParent !== null && !closed) { // Check if visible
            btn.click();
            closed = true;
          }
        });
        
        // Also try pressing Escape if no button found
        if (!closed) {
          document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape',
            keyCode: 27,
            which: 27,
            bubbles: true
          }));
        }
      } catch (error) {
        console.error('Error closing popup:', error);
      }
    }

    // Parse Nucleus Angular Material table
    async function parseNucleusTable(includePopups = false) {
      const tables = document.querySelectorAll('mat-table, .mat-table, table[role="grid"]');
      
      for (let [idx, table] of tables.entries()) {
        const key = `nucleus_table_${idx}`;
        
        // Get headers
        const headerCells = table.querySelectorAll('mat-header-cell, .mat-header-cell, th[role="columnheader"]');
        const headers = Array.from(headerCells).map(cell => {
          return cell.textContent.trim().replace(/\s+/g, ' ');
        });
        
        if (headers.length === 0) continue;
        
        // Get data rows
        const dataRows = table.querySelectorAll('mat-row:not(.mat-header-row), .mat-row:not(.mat-header-row), tr[role="row"]:not(:first-child)');
        const rows = [];
        
        for (let [rowIdx, row] of dataRows.entries()) {
          const cells = row.querySelectorAll('mat-cell, .mat-cell, td[role="gridcell"]');
          const rowData = {};
          
          // Extract basic row data
          headers.forEach((header, cellIdx) => {
            if (cells[cellIdx]) {
              let cellText = cells[cellIdx].textContent.trim().replace(/\s+/g, ' ');
              rowData[header] = cellText;
            }
          });
          
          // Check for popup icon and extract popup data if requested
          if (includePopups) {
            const visibilityIcons = row.querySelectorAll('mat-icon');
            let iconToClick = null;
            
            // Find visibility icon
            for (let icon of visibilityIcons) {
              if (icon.textContent.includes('visibility') || 
                  icon.getAttribute('mattooltip') === 'View Transaction' ||
                  icon.classList.contains('cursor-pointer')) {
                iconToClick = icon;
                break;
              }
            }
            
            if (iconToClick && iconToClick.offsetParent !== null) {
              try {
                console.log(`Processing popup for row ${rowIdx + 1}...`);
                
                // Click the icon
                iconToClick.click();
                
                // Wait for popup to load
                await sleep(800);
                
                // Extract popup data
                const popupData = extractNucleusPopupData();
                if (Object.keys(popupData).length > 0) {
                  rowData.popup_details = popupData;
                }
                
                // Close popup
                closePopup();
                await sleep(300);
                
              } catch (error) {
                console.error('Error processing popup for row:', rowIdx + 1, error);
              }
            }
          }
          
          if (!isEmptyRow(rowData)) {
            rows.push(rowData);
          }
        }
        
        if (rows.length > 0) {
          result[key] = rows;
        }
      }
    }

    // Parse standard Mambu tables
    function parseMambuTables() {
      const tables = document.querySelectorAll('table');
      
      tables.forEach((table, idx) => {
        const aria = table.getAttribute('aria-label');
        const key = aria ? aria.trim().replace(/\s+/g,'_') : `table_${idx}`;

        const allRows = Array.from(table.querySelectorAll('tr'));
        if (allRows.length === 0) return;

        const headerTrs = table.querySelectorAll('thead th');
        let rows = [];

        if (headerTrs.length) {
          const headers = Array.from(headerTrs).map(h => (h.innerText || h.textContent || '').trim());
          const dataRows = Array.from(table.querySelectorAll('tbody tr'));
          rows = dataRows.map(tr => {
            const cells = Array.from(tr.querySelectorAll('td'));
            const obj = {};
            headers.forEach((h, i) => { 
              const cellText = cells[i] ? (cells[i].innerText || cells[i].textContent || '').trim() : '';
              obj[h || `col${i}`] = cellText;
            });
            return obj;
          });
        } else {
          rows = allRows.map(tr => {
            const cells = tr.querySelectorAll('td');
            if (cells.length < 2) return null;
            const k = (cells[0].innerText || cells[0].textContent || '').trim();
            const v = (cells[1].innerText || cells[1].textContent || '').trim();
            return { [k]: v };
          }).filter(r => r && !isEmptyRow(r));
        }

        if (rows.length) {
          result[key] = rows;
        }
      });
    }

    // Safe download function that works in content scripts
    function downloadJSON(data, filename) {
      try {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        
        // Create download URL
        const url = URL.createObjectURL(blob);
        
        // Create and configure download link
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = filename;
        downloadLink.style.display = 'none';
        
        // Add to document, click, and cleanup
        document.body.appendChild(downloadLink);
        
        // Use setTimeout to ensure the element is in DOM before clicking
        setTimeout(() => {
          try {
            downloadLink.click();
          } catch (clickError) {
            console.error('Click failed, trying alternative method:', clickError);
            // Alternative method: dispatch click event
            const event = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true
            });
            downloadLink.dispatchEvent(event);
          } finally {
            // Cleanup
            setTimeout(() => {
              document.body.removeChild(downloadLink);
              URL.revokeObjectURL(url);
            }, 100);
          }
        }, 10);
        
        return true;
      } catch (error) {
        console.error('Download failed:', error);
        
        // Fallback: copy to clipboard
        try {
          const jsonStr = JSON.stringify(data, null, 2);
          navigator.clipboard.writeText(jsonStr).then(() => {
            alert('Download failed, but data has been copied to clipboard. You can paste it into a text file and save as .json');
          }).catch(() => {
            // Last resort: show in console
            console.log('Export data (copy from console):', data);
            alert('Download failed. Check the console for the exported data.');
          });
        } catch (clipboardError) {
          console.error('Clipboard fallback failed:', clipboardError);
          console.log('Export data (copy from console):', data);
          alert('Download failed. Check the console for the exported data.');
        }
        
        return false;
      }
    }

    // Main execution
    async function main() {
      console.log('Export action:', action);
      console.log('Current site:', isMambu ? 'Mambu' : isNucleus ? 'Nucleus' : 'Unknown');
      
      if (action === 'mambu' && isMambu) {
        parseMambuTables();
      } else if ((action === 'nucleus' || action === 'nucleus-popup') && isNucleus) {
        await parseNucleusTable(action === 'nucleus-popup');
      } else {
        // Fallback: try to parse whatever tables are available
        if (isMambu || (!isNucleus && !isMambu)) {
          parseMambuTables();
        } else if (isNucleus) {
          await parseNucleusTable(false);
        }
      }

      // Generate filename based on action and site
      let filename = 'export.json';
      if (action === 'mambu') {
        filename = 'mambu_export.json';
      } else if (action === 'nucleus') {
        filename = 'nucleus_export.json';
      } else if (action === 'nucleus-popup') {
        filename = 'nucleus_popup_export.json';
      }

      // Check if we have data to export
      if (Object.keys(result).length > 0) {
        const success = downloadJSON(result, filename);
        
        if (success) {
          console.log('Exported data:', Object.keys(result));
          console.log('Total rows exported:', Object.values(result).reduce((sum, table) => sum + (Array.isArray(table) ? table.length : 0), 0));
        }
      } else {
        console.warn('No data found to export');
        alert('No data found to export. Make sure you are on a page with tables.');
      }

      return result;
    }

    // Execute main function
    main().catch(error => {
      console.error('Export failed:', error);
      
      // Better error reporting
      let errorMessage = 'Export failed: ';
      if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Unknown error occurred. Check console for details.';
      }
      
      alert(errorMessage);
    });

  } catch (globalError) {
    console.error('Global error in content script:', globalError);
    alert('Extension error: ' + (globalError.message || 'Unknown error'));
  }
})();