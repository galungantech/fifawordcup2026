function stripTags(str) {
    return String(str)
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// ambil isi <tr><td>...</td></tr>
function parseHTMLTable(html) {
    const rowRegex = /<tr>(.*?)<\/tr>/g;
    const cellRegex = /<t[dh]>(.*?)<\/t[dh]>/g;

    const rows = [];
    let rowMatch;

    while ((rowMatch = rowRegex.exec(html)) !== null) {
        const rowContent = rowMatch[1];

        const cells = [];
        let cellMatch;

        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
            cells.push(stripTags(cellMatch[1]));
        }

        if (cells.length) rows.push(cells);
    }

    return rows;
}

// hitung lebar kolom
function getColWidths(rows) {
    const widths = [];

    rows.forEach(row => {
        row.forEach((cell, i) => {
            widths[i] = Math.max(widths[i] || 0, cell.length);
        });
    });

    return widths;
}

// padding
function pad(text, size) {
    text = String(text);
    return text + " ".repeat(Math.max(0, size - text.length));
}

// build ASCII table
function buildTable(rows) {
    const widths = getColWidths(rows);

    const line = widths.map(w => "-".repeat(w)).join("-+-");

    let out = "";

    rows.forEach((row, i) => {
        const lineRow = row
            .map((cell, j) => pad(cell, widths[j]))
            .join(" | ");

        out += lineRow + "\n";

        if (i === 0) {
            out += line + "\n";
        }
    });

    return out;
}

// MAIN RENDER FUNCTION
function renderHTMLTable(html) {
    const rows = parseHTMLTable(html);

    if (!rows.length) return "";

    const table = buildTable(rows);

    return "```\n" + table + "\n```";
}

module.exports = { renderHTMLTable };
