// Snapshot the Everlasting inventory feed sheet to data.json.
// Same source URL, column mapping, and cell rules as the site's live-pull logic.
const GVIZ_URL = 'https://docs.google.com/spreadsheets/d/1XAcrCSO-uOR1Z3ChKCkxkEWclOFRsfDdWen7K05BVpk/gviz/tq?tqx=out:json&headers=1';
const WAREHOUSES = [
  { label: 'WP (LA)',   col: 2 },
  { label: 'JCT (LA)',  col: 3 },
  { label: 'TFS (LA)',  col: 4 },
  { label: 'JNJ (NJ)',  col: 5 },
  { label: 'GLDI (NJ)', col: 6 },
  { label: 'FBA',       col: 8 }
];

function cellQty(c) {
  if (!c || c.v === null || c.v === undefined) return 0; // blank or #N/A = zero
  var n = Number(c.v);
  if (isNaN(n) || n <= 0) return 0;
  return n;
}

function parseGviz(text) {
  var s = text.indexOf('setResponse(');
  var json = JSON.parse(text.substring(s + 12, text.lastIndexOf(');')));
  var rows = [];
  json.table.rows.forEach(function (r) {
    var c = r.c || [];
    var sku = (c[0] && c[0].v ? String(c[0].v) : '').trim();
    if (!sku) return;
    var row = { sku: sku, name: (c[1] && c[1].v ? String(c[1].v) : '').trim(), wh: {} };
    WAREHOUSES.forEach(function (w) { row.wh[w.label] = cellQty(c[w.col]); });
    rows.push(row);
  });
  return rows;
}

const res = await fetch(GVIZ_URL + '&_=' + Date.now());
if (!res.ok) throw new Error('HTTP ' + res.status);
const text = await res.text();
const rows = parseGviz(text);
if (!rows.length) throw new Error('no rows parsed - sheet structure may have changed');
const out = { updated: new Date().toISOString(), rows: rows };
const { writeFileSync } = await import('node:fs');
writeFileSync('data.json', JSON.stringify(out));
console.log('wrote data.json:', rows.length, 'SKUs at', out.updated);
