require('dotenv').config();
const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const WP_USER = process.env.WP_USER;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;

// URLs da sua instalação de desenvolvimento na HostGator
const WP_POSTS_URL = 'https://ibnegocios.com.br/cms_Dev/?rest_route=/wp/v2/posts';
const WP_MEDIA_URL = 'https://ibnegocios.com.br/cms_Dev/?rest_route=/wp/v2/media';

// Função mágica que gera a imagem na IA e envia para a biblioteca do WordPress
async function gerarEEnviarImagem(promptDaImagem, credenciaisBase64) {
    try {
        console.log(`🎨 Gerando imagem na IA com o conceito: "${promptDaImagem}"...`);
        
        // Customiza o tamanho ideal de capa para blog (1200x630)
        const urlPollinations = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptDaImagem)}?width=1200&height=630&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

        // Baixa a imagem gerada como dados brutos (buffer)
        const respostaImagem = await axios.get(urlPollinations, { responseType: 'arraybuffer' });
        const bufferImagem = Buffer.from(respostaImagem.data, 'binary');

        console.log('📤 Enviando imagem de capa para a Biblioteca de Mídia do WordPress...');

        // Faz o upload para a biblioteca do WordPress
        const respostaMedia = await axios.post(WP_MEDIA_URL, bufferImagem, {
            headers: {
                'Authorization': `Basic ${credenciaisBase64}`,
                'Content-Type': 'image/jpeg',
                'Content-Disposition': 'attachment; filename="capa_automatica.jpg"'
            }
        });

        // Retorna o ID da imagem que o WordPress acabou de criar
        return respostaMedia.data.id;

    } catch (error) {
        console.error('⚠️ Não foi possível gerar ou subir a imagem, mas o post continuará sem capa.', error.message);
        return null;
    }
}

async function rodarGeradorAutonomo() {
    try {
        console.log('🤖 IA Ativada! Escolhendo tema e planejando imagem corporativa...');

        const contextoEmpresa = `
        Você é o redator principal do Instituto Brasileiro de Negócios (ibnegocios.com.br). 
        Nossa empresa tem o propósito de transformar empresas através da educação corporativa.
        `;

        const promptSistema = `
        ${contextoEmpresa}

        Escolha um tema estratégico de negócios/liderança.
        
        FORMATO OBRIGATÓRIO DA RESPOSTA (Siga estritamente as 3 partes separadas por linhas):
        Linha 1: Apenas o título do post (sem tags, sem aspas).
        Linha 2: Apenas um prompt de imagem em INGLÊS realista e corporativo que represente esse post (ex: "A modern corporate office with executives talking, high quality, professional photography").
        Linha 3 em diante: O artigo profundo estruturado diretamente com tags HTML (<h2>, <h3>, <p>, <ul>).
        `;

        const responseOpenRouter = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "openrouter/free", 
            messages: [{ role: "user", content: promptSistema }]
        }, {
            headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' }
        });

        const textoBrutoIA = responseOpenRouter.data.choices[0].message.content;
        const linhas = textoBrutoIA.split('\n').map(l => l.trim()).filter(l => l !== '');

        // Pega as duas primeiras linhas válidas
        const tituloArtigo = linhas[0];
        const promptImagem = linhas[1];
        const conteudoHtml = linhas.slice(2).join('\n');

        console.log(`\n📝 Título: "${tituloArtigo}"`);
        
        const credenciaisBase64 = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');

        // Dispara a geração da imagem antes de criar o post
        const idDaImagem = await gerarEEnviarImagem(promptImagem, credenciaisBase64);

        console.log('🚀 Publicando o rascunho finalizado...');

        // Dados do post (incluindo a imagem como "featured_media")
        const dadosDoPost = {
            title: tituloArtigo,
            content: conteudoHtml,
            status: 'draft'
        };

        if (idDaImagem) {
            dadosDoPost.featured_media = idDaImagem; // Amarra a foto ao post!
        }

        const responseWp = await axios.post(WP_POSTS_URL, dadosDoPost, {
            headers: { 'Authorization': `Basic ${credenciaisBase64}`, 'Content-Type': 'application/json' }
        });

        console.log('\n--- 🎉 AUTOMAÇÃO CONCLUÍDA COM SUCESSO ---');
        console.log(`✅ Rascunho criado com ID: ${responseWp.data.id}`);
        console.log(`🔗 Link: ${responseWp.data.link}`);
        console.log('-------------------------------------------\n');

    } catch (error) {
        console.error('❌ Erro durante a execução:', error.response ? error.response.data : error.message);
    }
}

rodarGeradorAutonomo();