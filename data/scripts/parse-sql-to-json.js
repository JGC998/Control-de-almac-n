const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../backup_completo.sql');
const OUTPUT_DIR = path.join(__dirname, '../src/data/migracion');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const sqlContent = fs.readFileSync(INPUT_FILE, 'utf8');

// 1. Extract Table Schemas to get Column Names
// Regex to catch CREATE TABLE `TableName` (...)
const createTableRegex = /CREATE TABLE `(\w+)` \(([\s\S]*?)\) ENGINE=/g;
const tableSchemas = {};
let match;

while ((match = createTableRegex.exec(sqlContent)) !== null) {
    const tableName = match[1];
    const columnsBlock = match[2];
    
    // Parse individual columns
    // We look for lines starting with `colName`
    const columns = [];
    const lines = columnsBlock.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        // Regex for column definition: `colName` type ...
        const colMatch = trimmed.match(/^`(\w+)`/);
        if (colMatch) {
            columns.push(colMatch[1]);
        }
    }
    tableSchemas[tableName] = columns;
}

console.log('Found schemas for:', Object.keys(tableSchemas).join(', '));

// 2. Extract INSERT INTO statements
// Regex: INSERT INTO `TableName` VALUES ... ;
const insertRegex = /INSERT INTO `(\w+)` VALUES\s*([\s\S]*?);/g;

let insertMatch;
while ((insertMatch = insertRegex.exec(sqlContent)) !== null) {
    const tableName = insertMatch[1];
    const valuesBlock = insertMatch[2];
    const columns = tableSchemas[tableName];

    if (!columns) {
        console.warn(`Warning: No schema found for table ${tableName}, skipping data.`);
        continue;
    }

    console.log(`Parsing data for ${tableName}...`);

    const rows = [];
    
    // Parse tuples: (val1, val2, ...), (val1, ...), ...
    // We need a robust state machine or regex to handle quoted strings containing parens/commas.
    // Given the complexity of regex for this, simple state parsing is safer and often faster for this specific format.
    
    let currentTuple = '';
    let inTuple = false;
    let inQuote = false;
    let escape = false;

    // Iterate through the values block char by char
    for (let i = 0; i < valuesBlock.length; i++) {
        const char = valuesBlock[i];

        if (escape) {
            if (inTuple) currentTuple += char;
            escape = false;
            continue;
        }

        if (char === '\\') {
            if (inTuple) currentTuple += char;
            escape = true;
            continue;
        }

        if (char === "'" && !escape) {
            inQuote = !inQuote;
            if (inTuple) currentTuple += char;
            continue;
        }

        if (char === '(' && !inQuote && !inTuple) {
            inTuple = true;
            currentTuple = ''; // Do NOT include the opening paren in the buffer for easier splitting later? 
            // Or better: keep parsing logic simple: just collect everything inside ( ... )
            continue;
        }

        if (char === ')' && !inQuote && inTuple) {
            inTuple = false;
            // End of tuple. Process 'currentTuple'
            const rowObj = parseTuple(currentTuple, columns);
            if (rowObj) rows.push(rowObj);
            currentTuple = '';
            continue;
        }

        if (inTuple) {
            currentTuple += char;
        }
    }

    // Write JSON file
    const outputPath = path.join(OUTPUT_DIR, `${tableName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(rows, null, 2), 'utf8');
    console.log(`Saved ${rows.length} rows to ${tableName}.json`);
}

/**
 * Parses a comma-separated value string into an object based on columns.
 * Handling quotes and nulls.
 * input: "'idVal', 123, NULL, 'Text with , comma'"
 */
function parseTuple(tupleStr, columns) {
    const values = [];
    let currentVal = '';
    let inQuote = false;
    let escape = false;

    for (let i = 0; i < tupleStr.length; i++) {
        const char = tupleStr[i];

        if (escape) {
            currentVal += char;
            escape = false;
            continue;
        }
        if (char === '\\') {
            // Keep the backslash for processing, or handle escape sequence?
            // MySQL Dump escapes: \', \", \n, \r, \\
            // We'll keep it to maintain raw string integrity or simple unescape.
            // Let's accumulate it for now.
            currentVal += char;
            escape = true;
            continue;
        }

        if (char === "'") {
            inQuote = !inQuote;
            currentVal += char; // Keep quotes to identify string type later
            continue;
        }

        if (char === ',' && !inQuote) {
            // Value separator
            values.push(processValue(currentVal.trim()));
            currentVal = '';
            continue;
        }

        currentVal += char;
    }
    // Push last value
    values.push(processValue(currentVal.trim()));

    if (values.length !== columns.length) {
        console.warn(`Mismatch in ${columns.length} cols vs ${values.length} vals:`, values);
        // Best effort: match indexes
    }

    const rowObj = {};
    columns.forEach((col, idx) => {
        rowObj[col] = values[idx];
    });
    return rowObj;
}

function processValue(rawVal) {
    if (rawVal === 'NULL') return null;
    if (rawVal.startsWith("'") && rawVal.endsWith("'")) {
        // Remove surrounding quotes and unescape
        let content = rawVal.substring(1, rawVal.length - 1);
        // Simple unescape for common MySQL escapes
        content = content.replace(/\\'/g, "'")
                         .replace(/\\"/g, '"')
                         .replace(/\\\\/g, '\\')
                         .replace(/\\n/g, '\n')
                         .replace(/\\r/g, '\r');
        return content;
    }
    // Number check
    if (!isNaN(Number(rawVal)) && rawVal !== '') {
        return Number(rawVal);
    }
    return rawVal; // Return as is (e.g. unquoted string or complex type?)
}
