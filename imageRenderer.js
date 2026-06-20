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
                font-family: Arial;
                background: #0f172a;
                color: white;
                padding: 20px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                background: #111827;
            }
            th, td {
                border: 1px solid #374151;
                padding: 10px;
                text-align: left;
            }
            th {
                background: #1f2937;
            }
        </style>
    </head>
    <body>
        ${htmlContent}
    </body>
    </html>
    `;

    await page.setContent(fullHTML, { waitUntil: "networkidle0" });

    const image = await page.screenshot({
        fullPage: true
    });

    await browser.close();

    return image;
}

module.exports = { renderImage };
