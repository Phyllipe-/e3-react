# e3-react

Editor de mapas 2D do **OMA Project** (Orientação e Mobilidade). Permite que professores criem e editem os ambientes navegáveis usados nas sessões de treino do app ENA (Unity).

Construído com React + Vite. Gera um site estático — não há backend próprio.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + Vite |
| Estado global | Context API (`TileMapContext`) |
| Estilo | CSS Modules |
| i18n | react-i18next (pt-BR / en) |
| Ícones | react-icons |
| Deploy | Nginx (Hetzner) via GitHub Actions |

## Pré-requisitos

- Node.js 18+
- [api-om](../api-om) rodando localmente (opcional — só necessário para salvar/carregar mapas pela API)

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
```

Não há `.env` necessário. A URL da API é configurada pelo professor dentro do próprio editor (painel "Configurações da API"). O token JWT fica em `localStorage`.

## Comandos

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Gera o site estático em `dist/` |
| `npm run preview` | Serve o build local para verificação |
| `npm run lint` | ESLint |

## Estrutura

```
e3-react/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── SpritesMap.js              # Mapeamento de sprites por categoria/camada
│   ├── contexts/
│   │   └── TileMapContext.jsx     # Estado global do editor (tilemap, API, histórico)
│   ├── components/
│   │   ├── Menu/                  # Novo, Salvar, Abrir arquivo
│   │   ├── TilemapCanvas/         # Canvas interativo — pintura de tiles
│   │   ├── ApiConfiguration/      # Painel de conexão com api-om
│   │   ├── EditModeLoader/        # Carrega mapa existente pelo id da URL (?mode=edit&id=X)
│   │   ├── Category/              # Seleção de categoria de sprite
│   │   ├── LayerList/             # Gerenciamento de camadas
│   │   ├── Attributes/            # Propriedades do tilemap (dimensões, tile size)
│   │   ├── View3D/                # Visualização 3D do mapa
│   │   └── ...                    # Outros painéis (Help, Display, Undo, etc.)
│   └── utils/
│       ├── apiService.js          # Login, upload, atualização de mapas na api-om
│       ├── adaptador.js           # Converte estado interno → formato E3Map
│       ├── converter.js           # Normaliza o E3Map para exportação
│       ├── converterJsonParaXml.js
│       ├── converterXmlParaJson.js
│       ├── converterJsonParaJson.js
│       ├── previewGenerator.js    # Gera thumbnail PNG do mapa para upload
│       └── fileNaming.js          # Nomeia o arquivo de export
├── .github/workflows/deploy.yml   # CI/CD
└── package.json
```

## Camadas do mapa

O editor trabalha com 8 camadas fixas (ordem de renderização de baixo para cima):

`floor` → `walls` → `door_and_windows` → `furniture` → `utensils` → `eletronics` → `interactive_elements` → `persons`

## Formatos de exportação

| Formato | Uso |
|---|---|
| JSON | Consumido pelo e3-react e pela api-om |
| XML | Consumido pelo app ENA (Unity) |

O download é gerado localmente (sem servidor). Se o professor estiver conectado à API, o mapa também é enviado automaticamente após o download.

## Integração com api-om

O editor é **opcional offline** — funciona sem API para criação e exportação local. A integração com api-om habilita:

- Salvar mapas com preview (thumbnail PNG) na nuvem
- Editar mapas existentes carregados pelo dashboard-om (`?mode=edit&id=X`)
- Histórico de versões gerenciado pela API

### Configurar a API no editor

1. Abrir o painel "Configurações da API" (ícone de engrenagem)
2. Inserir a URL da API, e-mail e senha do professor
3. Clicar em "Conectar" — o JWT é armazenado em `localStorage`

A senha **nunca é persistida** em `localStorage` — apenas o token JWT. Ao expirar (4h), o professor precisa reconectar.

## Modo de edição

Quando o dashboard-om abre um mapa existente para edição, redireciona para:

```
https://e3.omaproject.com.br/?mode=edit&id=<id_mapa>
```

O componente `EditModeLoader` detecta o parâmetro `mode=edit`, busca o XML do mapa via `GET /api/treinos/mapas/:id/arquivo` (com Authorization header) e carrega no editor.

## CI/CD

Push para `main` dispara o workflow em `.github/workflows/deploy.yml`:

1. `npm ci` — instala dependências
2. `npm run build` — gera `dist/`
3. Copia `dist/` para `/var/www/e3-react/` no servidor Hetzner

O runner self-hosted (`ghrunner` user) está instalado no mesmo servidor que serve o site.

## Segurança

- Token JWT em `localStorage` (persiste entre sessões)
- Senha em memória React apenas (nunca gravada)
- Downloads de arquivo usam `fetch` + `Authorization` header + `createObjectURL` — sem token na URL
- CORS controlado pela api-om via `ALLOWED_ORIGINS`

## Ambientes

| Ambiente | URL |
|---|---|
| Desenvolvimento | `http://localhost:5173` |
| Produção | `https://e3.omaproject.com.br` |
