require('dotenv').config();
const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const WP_USER = process.env.WP_USER;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;

const WP_POSTS_URL = 'https://ibnegocios.com.br/cms_Dev/?rest_route=/wp/v2/posts';

const SLEEP = ms => new Promise(res => setTimeout(res, ms));

const MODELOS_FALLBACK = [
    "moonshotai/kimi-k2.6:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "google/gemma-4-31b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
];

async function chamarOpenRouter(mensagemSistema) {
    const MAX_TENTATIVAS_POR_MODELO = 2;

    for (const modelo of MODELOS_FALLBACK) {
        for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_POR_MODELO; tentativa++) {
            try {
                console.log(`🔁 Usando modelo: ${modelo} (tentativa ${tentativa}/${MAX_TENTATIVAS_POR_MODELO})`);
                const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                    model: modelo,
                    messages: [
                        { role: "system", content: mensagemSistema },
                        { role: "user", content: "Escolha um tema estratégico de negócios ou liderança relevante para o momento atual do mercado brasileiro e escreva o artigo completo seguindo todas as instruções." }
                    ]
                }, {
                    headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' }
                });

                // OpenRouter às vezes retorna HTTP 200 com erro no corpo
                if (response.data?.error) {
                    const retryAfter = response.data.error?.metadata?.retry_after_seconds;
                    if (retryAfter != null && tentativa < MAX_TENTATIVAS_POR_MODELO) {
                        console.warn(`⏳ Rate limit (corpo). Aguardando ${Math.ceil(retryAfter)}s...`);
                        await SLEEP(Math.ceil(retryAfter) * 1000);
                        continue;
                    }
                    console.warn(`⚠️ Modelo ${modelo} indisponível. Tentando próximo...`);
                    break; // passa para o próximo modelo
                }

                return response;

            } catch (error) {
                const retryAfter = error.response?.data?.error?.metadata?.retry_after_seconds;
                const isRateLimit = error.response?.status === 429 || retryAfter != null;

                if (isRateLimit && tentativa < MAX_TENTATIVAS_POR_MODELO) {
                    const espera = Math.ceil(retryAfter ?? 20) * 1000;
                    console.warn(`⏳ Rate limit. Aguardando ${espera / 1000}s...`);
                    await SLEEP(espera);
                    continue;
                }

                console.warn(`⚠️ Modelo ${modelo} falhou (${error.response?.status ?? error.message}). Tentando próximo...`);
                break; // passa para o próximo modelo
            }
        }
    }

    throw new Error('Todos os modelos falharam. Tente novamente mais tarde.');
}

async function rodarGeradorAutonomo() {
    try {
        console.log('🤖 IA Ativada! Gerando artigo corporativo...');

        const mensagemSistema = `
            Você é o redator-chefe sênior do Instituto Brasileiro de Negócios (ibnegocios.com.br), referência nacional em educação corporativa.
            Seu público é composto por executivos, gestores e empreendedores brasileiros que buscam conteúdo denso, aplicável e baseado em evidências.

            PADRÃO DE QUALIDADE OBRIGATÓRIO:
            - Escreva como um especialista que viveu o tema, não como alguém que apenas pesquisou sobre ele.
            - Use exemplos reais de empresas brasileiras e globais, com contexto e análise — não apenas citações soltas.
            - Inclua dados, pesquisas ou referências reconhecidas quando relevante (McKinsey, Harvard Business Review, IBGE, etc.).
            - Cada seção deve entregar um insight concreto e acionável, não apenas conceitos genéricos.
            - O tom é direto, inteligente e respeitoso — sem excesso de entusiasmo, sem jargão vazio.
            - O artigo deve ter no mínimo 600 palavras, mas a qualidade e profundidade são mais importantes que a extensão.

            ESTRUTURA DO ARTIGO:
            1. Introdução impactante que apresenta o problema ou oportunidade com dados ou situação real (2-3 parágrafos)
            2. Corpo com 4 a 6 seções H2, cada uma com subtópicos H3 quando necessário
            3. Ao menos uma lista <ul> prática por seção principal
            4. Conclusão com síntese e chamada à reflexão ou ação

            FORMATO OBRIGATÓRIO DA RESPOSTA:
            Linha 1: Apenas o título do post (sem tags HTML, sem aspas, sem markdown, sem # — texto puro).
            Linha 2 em diante: O artigo completo usando tags HTML (<h2>, <h3>, <p>, <ul>, <li>, <strong>). Nenhum texto fora das tags.`;

        const responseOpenRouter = await chamarOpenRouter(mensagemSistema);

        const textoBrutoIA = responseOpenRouter.data.choices[0].message.content;
        const linhas = textoBrutoIA.split('\n').map(l => l.trim()).filter(l => l !== '');

        const tituloArtigo = linhas[0]
            .replace(/<[^>]+>/g, '')
            .replace(/^#+\s*/, '')
            .replace(/\*+/g, '')
            .trim();
        const conteudoHtml = linhas.slice(1).join('\n');

        console.log(`\n📝 Título: "${tituloArtigo}"`);

        const credenciaisBase64 = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');

        console.log('🚀 Publicando o rascunho...');

        const responseWp = await axios.post(WP_POSTS_URL, {
            title: tituloArtigo,
            content: conteudoHtml,
            status: 'draft'
        }, {
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
