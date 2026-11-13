# Permissões da mesa

O mestre abre **Jogadores**, clica no usuário e altera as permissões. Os campos ficam em `sessoesMembros/{sessaoId}_{usuarioId}` e chegam ao jogador por `onSnapshot`.

| Campo | Comportamento |
| --- | --- |
| `podeVerMapa` | Exibe a mesa e habilita as assinaturas de mapa, tokens, anotações, névoa e clima. |
| `podeMover` | Move tokens, sem autorizar mudanças em textos ou desenhos. |
| `podeAnotar` | Cria textos e traços, cola imagens; edita, move ou exclui anotações com `autorId` igual ao usuário. |
| `podeAdicionar` | Coloca personagens nas células reveladas. |

Sem documento de membro, nenhuma permissão é concedida. Membros antigos sem `podeVerMapa` continuam vendo a mesa; as outras permissões exigem `true`. Bloquear a visualização suspende todas as ações, preservando a configuração para quando o mestre liberar o mapa novamente.

Os movimentos usam os listeners do Firestore existentes. As coordenadas são enviadas em lotes a intervalos de aproximadamente 60 ms, com apenas a última posição pendente de cada item. A posição final é enviada ao soltar. Nome, vida, imagem e estilo não são sobrescritos pelo arraste.

## Regras no servidor

Este repositório não contém a configuração nem as regras atualmente publicadas do Firestore. Os controles da interface e a proteção da rota do mestre estão implementados, mas a autorização de requisições diretas precisa também ser aplicada nas regras publicadas do projeto Firebase.

O arquivo `firestore-permissoes.rules.example` contém os trechos para integrar às regras existentes. Não é um arquivo completo para substituir as regras de convites, sessões e cadastro. Remova permissões amplas que autorizem as mesmas rotas: uma regra permissiva sobreposta também permite o acesso.

Valide a integração no emulador antes de publicar: jogador não altera seu documento de membro; usuário sem visualização não lê os dados da mesa; movimento altera apenas coordenadas; anotação exige autoria; mestre mantém acesso total. A criação de membros por convite deve limitar os valores iniciais a `podeVerMapa: true` e às demais permissões `false`, sem permitir que o convidado se promova a mestre.

Os testes de navegador locais usam usuários e Firestore simulados. A publicação e a verificação das regras no Firebase real não foram realizadas.

## Colagem na mesa

Ctrl+V (ou Cmd+V) insere texto simples ou uma imagem da área de transferência no mapa. Campos editáveis mantêm a colagem nativa. Imagens viram anotações `tipo: imagem`, com `imagemUrl` em WebP, dimensões e autoria; são reduzidas para caber no documento do Firestore. Jogadores precisam de `podeAnotar` e só editam os próprios itens. A regra de criação de anotações deve aceitar também o tipo `imagem`, conforme o exemplo atualizado.
