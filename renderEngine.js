// ==========================
// HTML <table> → ASCII TABLE ENGINE
// ==========================

function stripTags(str) {
    return String(str || "")
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function parseHTMLTable(html) {
    const rowRegex = /<tr>(.*?)<\/tr>/gs;
    const cellRegex = /<t[dh]>(.*?)<\/t[dh]>/gs;

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

function getColWidths(rows) {
    const widths = [];

    rows.forEach(row => {
        row.forEach((cell, i) => {
            widths[i] = Math.max(widths[i] || 0, String(cell).length);
        });
    });

    return widths;
}

function pad(str, size) {
    str = String(str ?? "");
    return str + " ".repeat(Math.max(0, size - str.length));
}

function buildTable(rows) {
    const widths = getColWidths(rows);

    const line = widths.map(w => "-".repeat(w)).join("-+-");

    let out = "";

    rows.forEach((row, i) => {
        const lineRow = row
            .map((cell, j) => pad(cell, widths[j]))
            .join(" | ");

        out += lineRow + "\n";

        if (i === 0) out += line + "\n";
    });

    return out;
}

function renderHTMLTable(html) {
    const rows = parseHTMLTable(html);

    if (!rows.length) return "```\n(empty)\n```";

    const table = buildTable(rows);

    return "```\n" + table + "\n```";
}

module.exports = { renderHTMLTable };
