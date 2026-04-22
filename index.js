const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

// 👇 Importando a ferramenta do Pedrozz (tem que estar dentro da pasta Lottie-Whatsapp) / Importing Pedrozz's tool (must be inside Lottie-Whatsapp folder)
const { buildLottieSticker } = require('./Lottie-Whatsapp/src/index.js');

const MEU_NUMERO = '123456789'; // Deixe o seu número aqui / Leave your number here , use in this format countrycode then number suppose your country code is 91 and your number is 123456789 then your number is 91123456789

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

    const { version } = await fetchLatestBaileysVersion();
    console.log(`\nIniciando com a versão do WA Web: ${version.join('.')} / Starting with WA Web version: ${version.join('.')}`);

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            console.log('\n⏳ Solicitando código... / Requesting code...');
            try {
                const codigo = await sock.requestPairingCode(MEU_NUMERO);
                console.log(`\n🔥 SEU CÓDIGO É / YOUR CODE IS: ${codigo} 🔥`);
            } catch (erro) {
                console.log('\n❌ Erro ao pedir o código. / Error requesting code.', erro.message);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) setTimeout(startBot, 2000);
        } else if (connection === 'open') {
            console.log('\n✅ Bot conectado! Pode mandar o comando !testar ou !test no zap. / Bot connected! You can send the !testar or !test command on WhatsApp.');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;
        const text = m.message.conversation || m.message.extendedTextMessage?.text;

        if (text === '!testar' || text === '!test') {
            console.log('\n🚀 Comando recebido! Construindo a figurinha WAS do zero... / Command received! Building WAS sticker from scratch...');

            try {
                // 1. Cria a figurinha usando o script do Pedrozz / Creates the sticker using Pedrozz's script
                await buildLottieSticker({
                    baseFolder: path.resolve(__dirname, "Lottie-Whatsapp", "src", "exemple"),
                    imagePath: path.resolve(__dirname, "minha_foto.jpg"), // Sua foto aqui / Your photo here
                    output: path.resolve(__dirname, "figurinha_perfeita.was")
                });

                console.log('📦 Figurinha gerada e empacotada! Enviando pro WhatsApp... / Sticker generated and packaged! Sending to WhatsApp...');

                // 2. Lê a figurinha recém-criada / Reads the newly created sticker
                const stickerBuffer = fs.readFileSync('./figurinha_perfeita.was');

                // 3. Envia com todos os disfarces ligados / Sends with all disguises enabled
                await sock.sendMessage(m.key.remoteJid, {
                    sticker: stickerBuffer,
                    mimetype: 'application/was',
                    isLottie: true,      // Forçando o motor de animação pro celular aceitar / Forcing the animation engine so the phone accepts it
                    isAnimated: true
                });
                console.log('✨ Sucesso absoluto! Olha o celular! / Absolute success! Check your phone!');
            } catch (erro) {
                console.log('❌ Deu ruim na hora de construir ou enviar. / Something went wrong while building or sending.', erro);
            }
        }
    });
}

startBot();