# Performance Tracker com Assistente Analítico

Aplicação React/Vite para exploração de base extensa com:

- executor local para tratamento e agregação de grandes volumes
- fluxo de 2 agentes (Planner + Analyst)
- suporte a Google Gemini, OpenAI e Anthropic Claude
- resposta do Analyst em HTML renderizado no próprio app, no formato de relatório
- deploy compatível com Vercel via GitHub

## Como rodar localmente

1. Instale as dependências:
   `npm install`
2. Configure as chaves em `.env.local`:
   - `VITE_GEMINI_API_KEY`
   - `VITE_OPENAI_API_KEY`
   - `VITE_ANTHROPIC_API_KEY`
3. Execute:
   `npm run dev`

## Deploy no Vercel via GitHub

Use estas configurações no projeto da Vercel:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Node.js: `20.x`

Cadastre as variáveis de ambiente do projeto na Vercel:

- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

### Como funciona em produção

- o front tenta chamar primeiro a rota serverless `/api/ai`
- essa rota lê as chaves seguras da Vercel e chama o provedor de IA no servidor
- se a rota não existir em ambiente local, o app cai para o modo direto no navegador

Isso evita problemas comuns de CORS, exposição de chave no bundle e inconsistência entre ambiente local e deploy.

## Observações

- para bases muito grandes, a base inteira deve continuar sendo tratada localmente; o LLM recebe contexto analítico resumido
- o Planner só deve usar `limit` quando a pergunta pedir explicitamente top N, ranking limitado ou equivalente
