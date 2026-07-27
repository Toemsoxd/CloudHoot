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

// Todo lo que lleve 'await' DEBE estar dentro de esta función async
async function initBrowser() {
    try {
        console.log('Iniciando Chromium en segundo plano...');
        browser = await puppeteer.launch({
            headless: "new",
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        });

        page = await browser.newPage();
        
        // Configurar User-Agent ligero de Android Chrome 100
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Mobile Safari/537.36');
        
        // Simular pantalla de dispositivo móvil táctil
        await page.setViewport({ 
            width: 1024, 
            height: 600, 
            isMobile: true, 
            hasTouch: true 
        });
        
        console.log('Navegando a Kahoot...');
        await page.goto('https://www.myinstants.com/es/categories/sound%20effects/us/', { waitUntil: 'networkidle2' });
        console.log('¡Kahoot cargado y listo en memoria!');
    } catch (e) {
        console.error('Error iniciando Chromium:', e);
    }
}

// Iniciar la carga inmediatamente
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

    // Reenviar clicks/toques directamente
    socket.on('tap', async (coords) => {
        if (page) {
            try { await page.mouse.click(coords.x, coords.y); } catch (e) {}
        }
    });

    // Reenviar texto directo del teclado nativo
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

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor activo en puerto ${PORT}`);
});
