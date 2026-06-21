const puppeteer = require("puppeteer");

async function renderImage(htmlContent) {

    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    const fullHTML = `
<html>
<head>
<style>

body {
    margin: 0;
    padding: 18px;
    background: #0b1220;
    font-family: Arial, sans-serif;
    color: white;
}

h2 {
    text-align: center;
    color: #facc15;
    margin-bottom: 15px;
}

.section {
    margin-bottom: 18px;
}

.card {
    background: #111827;
    padding: 10px;
    border-radius: 10px;
    margin-bottom: 8px;
    border-left: 4px solid #374151;
}

.live {
    border-left: 4px solid #ef4444;
}

.ft {
    border-left: 4px solid #22c55e;
}

.upcoming {
    border-left: 4px solid #3b82f6;
}

.title {
    font-weight: bold;
    margin-bottom: 6px;
}

.small {
    font-size: 12px;
    color: #9ca3af;
}

.badge-live {
    color: #ef4444;
    font-weight: bold;
}

.badge-ft {
    color: #22c55e;
    font-weight: bold;
}

table {
    width: 100%;
    margin-top: 5px;
    border-collapse: collapse;
    font-size: 12px;
}

td {
    padding: 4px;
    border-bottom: 1px solid #1f2937;
}

</style>
</head>
<body>
${htmlContent}
</body>
</html>
`;

    await page.setContent(fullHTML, { waitUntil: "networkidle0" });

    const buffer = await page.screenshot({ fullPage: true });

    await browser.close();

    return buffer;
}

module.exports = { renderImage };
