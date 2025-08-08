document.addEventListener('DOMContentLoaded', () => {
  const mambuBtn = document.getElementById('mambu-export');
  const nucleusBtn = document.getElementById('nucleus-export');
  const captureBtn = document.getElementById('capture-current-popup');

  async function executeExport(action) {
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      
      if (!tab?.id) {
        console.error('No active tab found');
        return;
      }

      // First, inject the action variable
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (actionParam) => {
          window.exportAction = actionParam;
        },
        args: [action]
      });
      
      // Then run the appropriate extraction function
      let result;
      if (action === 'capture-popup') {
        // Use the new capture function for open popups
        [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: captureCurrentPopup
        });
      } else {
        // Use the existing extraction function for other actions
        [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractData,
          args: [action]
        });
      }

      if (result && result.result && Object.keys(result.result).length > 0) {
        // Generate filename based on action
        let filename = 'export.json';
        if (action === 'mambu') {
          filename = 'mambu_export.json';
        } else if (action === 'nucleus') {
          filename = 'nucleus_export.json';
        } else if (action === 'capture-popup') {
          filename = 'popup_capture_export.json';
        }

        // Use chrome.downloads API for reliable downloading
        const jsonStr = JSON.stringify(result.result, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        try {
          await chrome.downloads.download({
            url: url,
            filename: filename,
            saveAs: false
          });
          console.log('Download initiated successfully');
          
        } catch (downloadError) {
          console.error('Chrome downloads API failed:', downloadError);
          // Fallback: copy to clipboard
          try {
            await navigator.clipboard.writeText(jsonStr);
            alert('Download failed, but data has been copied to clipboard. You can paste it into a text file and save as .json');
          } catch (clipboardError) {
            console.error('Clipboard fallback failed:', clipboardError);
            alert('Export completed but download failed. Check the console for the data.');
            console.log('Export data:', result.result);
          }
        } finally {
          URL.revokeObjectURL(url);
        }
      } else {
        if (action === 'capture-popup') {
          alert('No open popup found or no data could be extracted from the current popup.');
        } else {
          alert('No data found to export. Make sure you are on a page with tables.');
        }
      }

      window.close();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + (error.message || 'Unknown error'));
    }
  }

  // NEW: Function to capture data from currently open popup
  async function captureCurrentPopup() {
    console.log('Scanning for open popups...');
    
    const result = {
      capture_timestamp: new Date().toISOString(),
      popup_data: {},
      extraction_method: 'current_popup_capture'
    };

    // Utility functions
    function cleanText(text) { return text ? text.trim().replace(/\s+/g, ' ') : ''; }
    function isEmptyVal(v) { return v == null || String(v).trim() === '' || String(v).trim() === '-'; }

    // Look for currently open dialogs/modals/popups
    const possibleContainers = [
      '.mat-dialog-content',
      '.mat-dialog-container', 
      '[role="dialog"]',
      '.modal-content',
      '.popup-content',
      '.dialog-content',
      '.overlay-content',
      '[aria-modal="true"]',
      '.ui-dialog-content',
      '.popup',
      '.modal',
      '.dialog'
    ];
    
    let foundElements = [];
    let uniqueContainers = [];
    
    // Find all visible popup containers and deduplicate
    for (const selector of possibleContainers) {
      const containers = document.querySelectorAll(selector);
      containers.forEach(container => {
        // Check if container is visible and has content
        if (container.offsetParent !== null && container.textContent.trim().length > 0) {
          // Check if this element is already found (avoid duplicates)
          const isAlreadyFound = foundElements.some(existingElement => {
            return existingElement === container || 
                   existingElement.contains(container) || 
                   container.contains(existingElement);
          });
          
          if (!isAlreadyFound) {
            foundElements.push(container);
            uniqueContainers.push({
              selector: selector,
              element: container,
              content_length: container.textContent.trim().length
            });
          }
        }
      });
    }

    if (uniqueContainers.length === 0) {
      console.log('No open popups detected');
      return { error: 'No open popup found' };
    }

    console.log(`Found ${uniqueContainers.length} unique popup container(s)`);

    // Process each unique container
    uniqueContainers.forEach((container, index) => {
      const containerData = {
        container_info: {
          selector: container.selector,
          content_length: container.content_length,
          element_tag: container.element.tagName.toLowerCase()
        },
        extracted_fields: {},
        tables: [],
        sections: []
      };

      const dialogContent = container.element;

      try {
        // Strategy 1: Extract from mat-grid-tile structure
        const gridTiles = dialogContent.querySelectorAll('mat-grid-tile');
        if (gridTiles.length > 0) {
          console.log('Found mat-grid-tile structure');
          gridTiles.forEach(tile => {
            const figure = tile.querySelector('figure');
            if (figure) {
              const strong = figure.querySelector('strong');
              if (strong) {
                const label = cleanText(strong.textContent.replace(':', ''));
                const value = cleanText(figure.textContent.replace(strong.textContent, ''));
                if (label && !isEmptyVal(value)) {
                  containerData.extracted_fields[label] = value;
                }
              }
            }
          });
        }

        // Strategy 2: Extract from any table structures
        const tables = dialogContent.querySelectorAll('table, mat-table, .mat-table, [role="grid"]');
        tables.forEach((table, tableIndex) => {
          console.log(`Processing table ${tableIndex + 1} in container ${index + 1}`);
          const tableData = { 
            table_index: tableIndex,
            headers: [], 
            rows: [] 
          };
          
          // Get headers
          const headerCells = table.querySelectorAll('th, mat-header-cell, .mat-header-cell, [role="columnheader"]');
          if (headerCells.length > 0) {
            headerCells.forEach(cell => {
              const headerText = cleanText(cell.textContent);
              if (headerText) tableData.headers.push(headerText);
            });
          }

          // Get rows
          const dataRows = table.querySelectorAll('tr:not(:has(th)), mat-row:not(.mat-header-row), .mat-row:not(.mat-header-row)');
          dataRows.forEach(row => {
            const cells = row.querySelectorAll('td, mat-cell, .mat-cell, [role="gridcell"]');
            const rowData = {};
            
            if (tableData.headers.length > 0) {
              cells.forEach((cell, cellIndex) => {
                const cellText = cleanText(cell.textContent);
                const headerKey = tableData.headers[cellIndex] || `Column_${cellIndex + 1}`;
                if (!isEmptyVal(cellText)) {
                  rowData[headerKey] = cellText;
                }
              });
            } else {
              cells.forEach((cell, cellIndex) => {
                const cellText = cleanText(cell.textContent);
                if (!isEmptyVal(cellText)) {
                  rowData[`Cell_${cellIndex + 1}`] = cellText;
                }
              });
            }
            
            if (Object.keys(rowData).length > 0) {
              tableData.rows.push(rowData);
            }
          });

          if (tableData.rows.length > 0) {
            containerData.tables.push(tableData);
          }
        });

        // Strategy 3: Extract key-value pairs from any element containing colons
        const allElements = dialogContent.querySelectorAll('*');
        allElements.forEach(element => {
          const text = cleanText(element.textContent);
          
          // Skip if element has many children (to avoid duplicating data)
          if (element.children.length > 2) return;
          
          // Look for colon-separated key-value pairs
          if (text.includes(':') && text.length < 200 && text.length > 3) {
            const colonIndex = text.indexOf(':');
            const key = cleanText(text.substring(0, colonIndex));
            const value = cleanText(text.substring(colonIndex + 1));
            
            if (key && !isEmptyVal(value) && key.length < 50 && key.length > 1) {
              // Avoid duplicates
              if (!containerData.extracted_fields[key]) {
                containerData.extracted_fields[key] = value;
              }
            }
          }
        });

        // Strategy 4: Extract from form elements
        const inputs = dialogContent.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
          const label = input.labels?.[0]?.textContent || 
                       input.getAttribute('placeholder') || 
                       input.getAttribute('aria-label') ||
                       input.getAttribute('name');
          const value = input.value || input.textContent;
          
          if (label && !isEmptyVal(value)) {
            const cleanLabel = cleanText(label.replace(':', ''));
            const cleanValue = cleanText(value);
            if (cleanLabel && cleanValue) {
              containerData.extracted_fields[cleanLabel] = cleanValue;
            }
          }
        });

        // Strategy 5: Extract from definition lists
        const definitionLists = dialogContent.querySelectorAll('dl');
        definitionLists.forEach(dl => {
          const terms = dl.querySelectorAll('dt');
          const definitions = dl.querySelectorAll('dd');
          
          terms.forEach((term, termIndex) => {
            const key = cleanText(term.textContent);
            const value = definitions[termIndex] ? cleanText(definitions[termIndex].textContent) : '';
            if (key && !isEmptyVal(value)) {
              containerData.extracted_fields[key] = value;
            }
          });
        });

        // Strategy 6: Extract from sections with structured content
        const sections = dialogContent.querySelectorAll('.section, section, .panel, .card, .info-block, .content-block');
        sections.forEach((section, sectionIndex) => {
          const sectionText = cleanText(section.textContent);
          if (sectionText && sectionText.length > 20 && sectionText.length < 1000) {
            const sectionData = {};
            
            // Try to extract key-value pairs from section
            const lines = sectionText.split('\n').map(line => line.trim()).filter(line => line);
            lines.forEach(line => {
              if (line.includes(':')) {
                const colonIndex = line.indexOf(':');
                const key = cleanText(line.substring(0, colonIndex));
                const value = cleanText(line.substring(colonIndex + 1));
                if (key && !isEmptyVal(value) && key.length < 30) {
                  sectionData[key] = value;
                }
              }
            });
            
            if (Object.keys(sectionData).length > 0) {
              containerData.sections.push({
                section_index: sectionIndex,
                content: sectionData
              });
            }
          }
        });

        // Clean up empty arrays/objects
        if (containerData.tables.length === 0) delete containerData.tables;
        if (containerData.sections.length === 0) delete containerData.sections;
        if (Object.keys(containerData.extracted_fields).length === 0) delete containerData.extracted_fields;

      } catch (error) {
        console.error('Error extracting from container:', error);
        containerData.extraction_error = error.message;
      }

      // Add this container's data to results
      result.popup_data[`container_${index}`] = containerData;
    });

    console.log('Popup capture complete:', {
      containers_found: uniqueContainers.length,
      total_fields: Object.values(result.popup_data).reduce((sum, container) => 
        sum + Object.keys(container.extracted_fields || {}).length, 0),
      total_tables: Object.values(result.popup_data).reduce((sum, container) => 
        sum + (container.tables || []).length, 0)
    });

    return result;
  }

  // Existing data extraction function (simplified - no popup processing)
  async function extractData(action) {
    // Get the current URL and determine site
    const currentUrl = window.location.href;
    const isMambu = currentUrl.includes('mambu.oaknorth-it.com');
    const isNucleus = currentUrl.includes('nucleus.oaknorth.co.uk');
    
    let result = {};

    // Utility functions
    function isEmptyVal(v) { return v == null || String(v).trim() === ''; }
    function isEmptyRow(row) { return Object.values(row).every(isEmptyVal); }

    // Parse Nucleus tables (basic - no popup processing)
    function parseNucleusTable() {
      const tables = document.querySelectorAll('mat-table, .mat-table, table[role="grid"]');
      
      for (let [idx, table] of tables.entries()) {
        const key = `nucleus_table_${idx}`;
        
        const headerCells = table.querySelectorAll('mat-header-cell, .mat-header-cell, th[role="columnheader"]');
        const headers = Array.from(headerCells).map(cell => {
          return cell.textContent.trim().replace(/\s+/g, ' ');
        });
        
        if (headers.length === 0) continue;
        
        const dataRows = table.querySelectorAll('mat-row:not(.mat-header-row), .mat-row:not(.mat-header-row), tr[role="row"]:not(:first-child)');
        const rows = [];
        
        for (let [rowIdx, row] of dataRows.entries()) {
          const cells = row.querySelectorAll('mat-cell, .mat-cell, td[role="gridcell"]');
          const rowData = {};
          
          headers.forEach((header, cellIdx) => {
            if (cells[cellIdx]) {
              let cellText = cells[cellIdx].textContent.trim().replace(/\s+/g, ' ');
              rowData[header] = cellText;
            }
          });
          
          if (!isEmptyRow(rowData)) {
            rows.push(rowData);
          }
        }
        
        if (rows.length > 0) {
          result[key] = rows;
        }
      }
    }

    // Parse Mambu tables
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

    // Execute based on action and site
    if (action === 'mambu' && isMambu) {
      parseMambuTables();
    } else if (action === 'nucleus' && isNucleus) {
      parseNucleusTable();
    } else {
      // Fallback: try to parse whatever tables are available
      if (isMambu || (!isNucleus && !isMambu)) {
        parseMambuTables();
      } else if (isNucleus) {
        parseNucleusTable();
      }
    }

    console.log('Extracted data:', Object.keys(result));
    return result;
  }

  // Event listeners
  if (mambuBtn) {
    mambuBtn.addEventListener('click', () => executeExport('mambu'));
  }
  
  if (nucleusBtn) {
    nucleusBtn.addEventListener('click', () => executeExport('nucleus'));
  }

  // NEW: Event listener for popup capture
  if (captureBtn) {
    captureBtn.addEventListener('click', () => {
      executeExport('capture-popup');
    });
  }

  // Simplified keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case '1':
          event.preventDefault();
          if (mambuBtn && !mambuBtn.disabled) mambuBtn.click();
          break;
        case '2':
          event.preventDefault();
          if (nucleusBtn && !nucleusBtn.disabled) nucleusBtn.click();
          break;
        case '3':
          event.preventDefault();
          if (captureBtn && !captureBtn.disabled) captureBtn.click();
          break;
      }
    }
  });
});