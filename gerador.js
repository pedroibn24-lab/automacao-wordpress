// ============================================================
// DEPENDÊNCIAS E CONFIGURAÇÃO INICIAL
// ============================================================
require('dotenv').config();
const axios = require('axios');

// Credenciais e configurações lidas do arquivo .env
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const WP_USER = process.env.WP_USER;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;

// Endpoint da API REST do WordPress para criação de posts
const WP_POSTS_URL = 'https://ibnegocios.com.br/cms_Dev/?rest_route=/wp/v2/posts';

// Utilitário para pausar a execução sem bloquear o event loop
const SLEEP = ms => new Promise(res => setTimeout(res, ms));

// ============================================================
// LISTA DE MODELOS — FALLBACK EM CASCATA
// ============================================================
// Se um modelo falhar ou atingir rate limit, o próximo da lista é tentado
const MODELOS_FALLBACK = [
    "moonshotai/kimi-k2.6:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "google/gemma-4-31b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
];

// ============================================================
// CHAMADA À API DO OPENROUTER COM RETRY E FALLBACK
// ============================================================
// Tenta cada modelo até MAX_TENTATIVAS_POR_MODELO vezes.
// Respeita o retry_after retornado pela API em caso de rate limit.
// Lança erro somente se todos os modelos falharem.
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

                // Rate limit retornado no corpo da resposta (HTTP 200 com erro interno)
                if (response.data?.error) {
                    const retryAfter = response.data.error?.metadata?.retry_after_seconds;
                    if (retryAfter != null && tentativa < MAX_TENTATIVAS_POR_MODELO) {
                        console.warn(`⏳ Rate limit (corpo). Aguardando ${Math.ceil(retryAfter)}s...`);
                        await SLEEP(Math.ceil(retryAfter) * 1000);
                        continue;
                    }
                    console.warn(`⚠️ Modelo ${modelo} indisponível. Tentando próximo...`);
                    break; // Passa para o próximo modelo
                }

                return response;

            } catch (error) {
                // Rate limit retornado via HTTP 429 ou campo retry_after no erro
                const retryAfter = error.response?.data?.error?.metadata?.retry_after_seconds;
                const isRateLimit = error.response?.status === 429 || retryAfter != null;

                if (isRateLimit && tentativa < MAX_TENTATIVAS_POR_MODELO) {
                    const espera = Math.ceil(retryAfter ?? 20) * 1000;
                    console.warn(`⏳ Rate limit. Aguardando ${espera / 1000}s...`);
                    await SLEEP(espera);
                    continue;
                }

                console.warn(`⚠️ Modelo ${modelo} falhou (${error.response?.status ?? error.message}). Tentando próximo...`);
                break; // Passa para o próximo modelo
            }
        }
    }

    throw new Error('Todos os modelos falharam. Tente novamente mais tarde.');
}

// ============================================================
// FUNÇÃO PRINCIPAL — GERAÇÃO E PUBLICAÇÃO DO ARTIGO
// ============================================================
async function rodarGeradorAutonomo() {
    try {
        console.log('🤖 IA Ativada! Gerando artigo corporativo...');

        // --------------------------------------------------------
        // PROMPT DO SISTEMA — instrui o modelo sobre tom, estrutura
        // e formato obrigatório da resposta
        // --------------------------------------------------------
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

        // --------------------------------------------------------
        // PARSING DA RESPOSTA — separa título do corpo HTML
        // --------------------------------------------------------
        const textoBrutoIA = responseOpenRouter.data.choices[0].message.content;
        const linhas = textoBrutoIA.split('\n').map(l => l.trim()).filter(l => l !== '');

        // Remove tags HTML, markdown e asteriscos que o modelo possa ter incluído no título
        const tituloArtigo = linhas[0]
            .replace(/<[^>]+>/g, '')
            .replace(/^#+\s*/, '')
            .replace(/\*+/g, '')
            .trim();
        const conteudoHtml = linhas.slice(1).join('\n');

        console.log(`\n📝 Título: "${tituloArtigo}"`);

        // --------------------------------------------------------
        // PUBLICAÇÃO NO WORDPRESS VIA REST API (rascunho)
        // --------------------------------------------------------
        // Autenticação via Application Password codificada em Base64
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

// ============================================================
// PONTO DE ENTRADA
// ============================================================
rodarGeradorAutonomo();
