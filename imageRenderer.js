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
                padding: 20px;
                background: #0b1220;
                font-family: Arial, sans-serif;
                color: white;
            }

            h2 { color: #facc15; }

            table {
                width: 100%;
                border-collapse: collapse;
                background: #111827;
                border-radius: 10px;
                overflow: hidden;
            }

            th {
                background: #1f2937;
                padding: 10px;
                text-align: left;
            }

            td {
                padding: 10px;
                border-top: 1px solid #374151;
            }

            tr:nth-child(even) {
                background: #0f172a;
            }

            .live { color: #ef4444; font-weight: bold; }
            .ft { color: #22c55e; font-weight: bold; }
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
