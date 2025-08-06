(function(){
  const result = {};

  // Helpers
  function isEmptyVal(v)    { return v == null || String(v).trim() === ''; }
  function isEmptyRow(row)  { return Object.values(row).every(isEmptyVal); }

  document.querySelectorAll('table').forEach((table, idx) => {
    // Build your result key
    const aria = table.getAttribute('aria-label');
    const key  = aria ? aria.trim().replace(/\s+/g,'_') : `table_${idx}`;

    // Find all <tr>s
    const allRows = Array.from(table.querySelectorAll('tr'));
    if (allRows.length === 0) return;

    // Do we have a real header row?
    const headerTrs = table.querySelectorAll('thead th');
    let rows = [];

    if (headerTrs.length) {
      // —— Standard table with <th> header —— 
      const headers = Array.from(headerTrs).map(h => h.innerText.trim() || '');
      // Data rows only in <tbody> or anything after header
      const dataRows = Array.from(table.querySelectorAll('tbody tr'));
      rows = dataRows.map(tr => {
        const cells = Array.from(tr.querySelectorAll('td'));
        const obj = {};
        headers.forEach((h,i) => { obj[h||`col${i}`] = (cells[i]?.innerText||'').trim(); });
        return obj;
      });
    } else {
      // —— No <th>: parse every row as key/value —— 
      rows = allRows.map(tr => {
        const cells = tr.querySelectorAll('td');
        if (cells.length < 2) return null;
        const k = cells[0].innerText.trim();
        const v = cells[1].innerText.trim();
        return { [k]: v };
      }).filter(r => r && !isEmptyRow(r));
    }

    // Finally, drop empty table
    if (rows.length) result[key] = rows;
  });

  // Download as JSON
  const jsonStr = JSON.stringify(result, null, 2);
  const blob    = new Blob([jsonStr], { type:'application/json' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = 'mambu_export.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.clear();
  console.log('✅ Exported tables:', Object.keys(result));
  return result;
})();
