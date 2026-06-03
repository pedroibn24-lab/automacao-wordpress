# Automação de Conteúdo para WordPress com OpenRouter

Este é um script automatizado em Node.js desenvolvido para gerar artigos profundos, profissionais e otimizados para SEO focados em educação corporativa, enviando-os diretamente para o painel do WordPress como rascunhos.

O motor de inteligência artificial utilizado é o **OpenRouter**, com sistema de fallback entre múltiplos modelos gratuitos (Kimi K2, Nvidia Nemotron, Google Gemma, Llama 3.3), garantindo resiliência e continuidade mesmo quando um modelo está indisponível.

---

## Funcionalidades

* **Geração Inteligente:** Criação de artigos estruturados diretamente com tags HTML (`<h2>`, `<h3>`, `<p>`, `<ul>`, `<li>`).
* **Integração Direta:** Conexão automática com a API REST do WordPress utilizando autenticação segura.
* **Segurança Primeiro:** Uso de variáveis de ambiente (`.env`) para garantir que nenhuma credencial seja exposta publicamente.

---

## Tecnologias Utilizadas

| Tecnologia | Descrição |
| :--- | :--- |
| **Node.js** | Ambiente de execução do JavaScript no backend. |
| **OpenRouter API** | Gateway de IA com fallback automático entre modelos: Kimi K2, Nvidia Nemotron, Google Gemma e Llama 3.3. |
| **Axios** | Cliente HTTP para requisições à API do OpenRouter e à API REST do WordPress. |
| **Dotenv** | Gestão de variáveis de ambiente e proteção de chaves de acesso. |

---

## Pré-requisitos e Instalação

Precisa ter o **Node.js** instalado na máquina.
