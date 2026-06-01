# Automação de Conteúdo para WordPress com Gemini API

Este é um script automatizado em Node.js desenvolvido para gerar artigos profundos, profissionais e otimizados para SEO focados em educação corporativa, enviando-os diretamente para o painel do WordPress como rascunhos.

O motor de inteligência artificial utilizado é o **Gemini 1.5 Flash** (via Google AI Studio), garantindo rapidez e alta qualidade na estruturação do conteúdo em HTML puro.

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
| **Gemini API** | Modelo `gemini-1.5-flash` para geração de texto. |
| **Axios** | Cliente HTTP para realizar as requisições às APIs da Google e do WordPress. |
| **Dotenv** | Gestão de variáveis de ambiente e proteção de chaves de acesso. |

---

## Pré-requisitos e Instalação

Precisa ter o **Node.js** instalado na máquina.
