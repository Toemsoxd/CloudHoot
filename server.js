const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const puppeteer = require('puppeteer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let browser;
let page;

async function initBrowser() {
    try {
        console.log('Iniciando Chromium en la nube...');
        browser = await puppeteer.launch({
            headless: "new",
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        });

        page = await browser.newPage();
        await page.setViewport({ width: 1024, height: 600 });
        await page.goto('https://kahoot.it', { waitUntil: 'networkidle2' });
        console.log('¡Kahoot cargado con éxito!');
    } catch (e) {
        console.error('Error al iniciar Chromium:', e);
    }
}

initBrowser();

io.on('connection', (socket) => {
    console.log('⚡ Tab 3 conectada');

    let isCapturing = true;

    const streamScreen = async () => {
        while (isCapturing && page) {
            try {
                const screenshot = await page.screenshot({ type: 'jpeg', quality: 40 });
                socket.emit('frame', screenshot.toString('base64'));
            } catch (err) {
                break;
            }
            await new Promise(r => setTimeout(r, 60)); // ~15-20 fps
        }
    };

    streamScreen();

    socket.on('tap', async (coords) => {
        if (page) {
            try { await page.mouse.click(coords.x, coords.y); } catch (e) {}
        }
    });

    socket.on('type_text', async (text) => {
        if (page) {
            try {
                await page.keyboard.type(text);
                await page.keyboard.press('Enter');
            } catch (e) {}
        }
    });

    socket.on('disconnect', () => {
        isCapturing = false;
        console.log('❌ Tab 3 desconectada');
    });
});

// ESCUCHAR EN 0.0.0.0 Y EN EL PUERTO DE RENDER
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CloudHoot activo en el puerto ${PORT}`);
});
