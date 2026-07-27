const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const puppeteer = require('puppeteer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', async (socket) => {
    console.log('⚡ Tab 3 conectada');

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
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

        const page = await browser.newPage();
        // Resolución optimizada para la pantalla de la Tab 3 (1024x600)
        await page.setViewport({ width: 1024, height: 600 });
        await page.goto('https://kahoot.it', { waitUntil: 'networkidle2' });

        let isCapturing = true;

        // Captura continua de pantalla
        const streamScreen = async () => {
            while (isCapturing) {
                try {
                    const screenshot = await page.screenshot({ type: 'jpeg', quality: 45 });
                    socket.emit('frame', screenshot.toString('base64'));
                } catch (err) {
                    break;
                }
                await new Promise(r => setTimeout(r, 40)); // ~25 fps
            }
        };

        streamScreen();

        // Eventos táctiles
        socket.on('tap', async (coords) => {
            try {
                await page.mouse.click(coords.x, coords.y);
            } catch (e) {}
        });

        // Evento de texto teclado
        socket.on('type_text', async (text) => {
            try {
                await page.keyboard.type(text);
                await page.keyboard.press('Enter');
            } catch (e) {}
        });

        socket.on('disconnect', async () => {
            isCapturing = false;
            if (browser) await browser.close();
            console.log('❌ Tab 3 desconectada');
        });

    } catch (error) {
        console.error('Error iniciando Puppeteer:', error);
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 CloudHoot activo en puerto ${PORT}`);
});