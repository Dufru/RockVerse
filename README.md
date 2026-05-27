# RockVerse - Streaming Social de Rock

Projeto fullstack focado em rock, com interface estilo plataforma de streaming, player via YouTube, comentários da comunidade, sistema de `Amei` e painel admin para curadoria do catálogo.

## 1) Funcionalidades principais
- Login e cadastro com JWT
- Home com 4 trilhas fixas:
  - Shows ao Vivo
  - Metal
  - Mais Comentados
  - Mais Amei
- Player com embed do YouTube
- Comentários por vídeo
- Botão `Amei` com toggle (curtir/descurtir)
- Pesquisa de vídeos
- Ranking da comunidade
- Painel Admin para:
  - adicionar/editar/remover vídeos
  - configurar destaque principal e rotação da Home

## 2) Tecnologias usadas
- Frontend: React + Vite
- Backend: Node.js + Express
- Banco principal: MongoDB
- Cache e ranking: Redis
- Autenticação: JWT

## 3) Tutorial simples para rodar

### Pré-requisitos
- Node.js 20+
- Docker + Docker Compose

### Passo a passo
1. Clone o repositório.
2. Instale as dependências na raiz:
```bash
npm install
```
3. Crie os arquivos de ambiente a partir dos exemplos:

Windows (PowerShell):
```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Linux/Mac:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

4. Suba MongoDB e Redis:
```bash
docker compose up -d
```

5. Rode o seed inicial (não apaga seus dados já cadastrados):
```bash
npm run seed -w backend
```

6. Inicie o projeto:
```bash
npm run dev
```

### Endereços
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Healthcheck: `http://localhost:4000/api/health`

## 4) Explicando o projeto

### Descrição da ideia
O RockVerse é uma plataforma web de streaming social focada exclusivamente em rock. O sistema reúne shows ao vivo gravados e álbuns clássicos, permitindo que usuários assistam conteúdos via YouTube, comentem em tempo real e interajam com o botão de "Amei". A proposta foi construída para unir curadoria temática e participação da comunidade em uma experiência simples e moderna.

### Justificativa da escolha do tema
O tema foi escolhido por ser um recorte específico e criativo dentro do universo de streaming. Em vez de uma solução genérica, o projeto foca em uma comunidade musical bem definida (rock), com elementos de descoberta, discussão e ranking social. Isso atende ao requisito de originalidade e permite explorar de forma prática as vantagens de bancos NoSQL.

### Modelagem do MongoDB
O MongoDB foi usado como banco principal e persistente da aplicação.

Coleções principais:
- `users`: dados de autenticação e perfil básico (`username`, `email`, `passwordHash`, `role`)
- `tracks`: catálogo de vídeos (`title`, `artist`, `youtubeVideoId`, `coverImage`, `bannerImage`, etc.)
- `trackcomments`: comentários por vídeo e usuário
- `trackloves`: relação de likes por vídeo e usuário (com índice único para impedir duplicidade)
- `siteconfigs`: configurações da Home (destaque principal, lista de destaques e rotação)

Relacionamentos:
- comentário referencia `track` e `user`
- like referencia `track` e `user`
- configuração referencia vídeos de destaque

Essa modelagem favorece flexibilidade e evolução do sistema sem migrações complexas.

### Como o Redis foi utilizado (e por quê)
O Redis foi usado de forma estratégica para desempenho:
- cache de seções da Home
- cache de listagens e comentários
- ranking de usuários por comentários
- ranking de usuários por likes
- ranking de vídeos mais comentados e mais amados
- contadores rápidos de likes

Decisão técnica:
- MongoDB é a fonte oficial dos dados
- Redis é a camada de aceleração
- no boot da API, o estado de ranking no Redis é reconstruído a partir do MongoDB para manter consistência após reinícios

## 5) Organização do projeto
- `backend/src/config`: conexões com MongoDB e Redis
- `backend/src/models`: schemas do Mongoose
- `backend/src/routes`: rotas da API (auth, tracks, admin)
- `backend/src/services`: cache e bootstrap do Redis
- `frontend/src/components`: componentes da interface
- `frontend/src/config`: fallback visual de capas


