# TP 5 : Cache HTTP

## Objectifs

- Comprendre le fonctionnement du cache
- Observer les headers de cache
- Tester la validation avec `ETag`

---

## Étapes

## 5.1 Observer le cache

### Première requête

```bash
curl -i https://httpbin.org/cache/60
```

**Headers à vérifier :**

- `Cache-Control`
- `ETag`
- `Expires`

**Résultat :**

```json
HTTP/2 200
date: Tue, 28 Apr 2026 19:59:13 GMT
content-type: application/json
content-length: 260
server: gunicorn/19.9.0
cache-control: public, max-age=60
access-control-allow-origin: *
access-control-allow-credentials: true

{
  "args": {},
  "headers": {
    "Accept": "*/*",
    "Host": "httpbin.org",
    "User-Agent": "curl/8.5.0",
    "X-Amzn-Trace-Id": "Root=1-69f11191-4f63a7905020042f77d41c26"
  },
  "origin": "105.77.200.246",
  "url": "https://httpbin.org/cache/60"
}
```

**Analyse :**

- `Cache-Control: public, max-age=60` : Indique que la réponse peut être mise en cache par les caches publics (comme les proxys) pendant 60 secondes.
- `ETag` : Non présent dans cette réponse, mais attendu pour la validation conditionnelle.
- `Expires` : Non spécifié, donc la durée de vie est déterminée par `max-age`.

---

## 5.2 Requête conditionnelle

### Obtenir l'ETag

```bash
curl -i https://httpbin.org/etag/test123
```

**Résultat :**

```text
HTTP/2 200
date: Tue, 28 Apr 2026 20:00:40 GMT
content-type: application/json
content-length: 264
server: gunicorn/19.9.0
etag: test123
access-control-allow-origin: *
access-control-allow-credentials: true

{
  "args": {},
  "headers": {
    "Accept": "*/*",
    "Host": "httpbin.org",
    "User-Agent": "curl/8.5.0",
    "X-Amzn-Trace-Id": "Root=1-69f111e8-64d9666c5fe106466b903dab"
  },
  "origin": "105.77.200.246",
  "url": "https://httpbin.org/etag/test123"
}
```

**ETag obtenu :**

`test123`

### Requête avec `If-None-Match`

```bash
curl -i -H "If-None-Match: test123" https://httpbin.org/etag/test123
```

Cette requête devrait retourner `304 Not Modified`.

**Résultat :**

```text
HTTP/2 304
date: Tue, 28 Apr 2026 20:01:48 GMT
server: gunicorn/19.9.0
etag: test123
access-control-allow-origin: *
access-control-allow-credentials: true
```

**Analyse :**

- `HTTP/2 304 Not Modified` : Le serveur indique que la ressource n'a pas changé depuis la dernière requête.
- `ETag: test123` : L'identifiant reste identique, confirmant que le contenu n'a pas été modifié.
- Aucun corps de réponse : Le client peut utiliser sa version en cache puisque le contenu est identique.
- Cette réponse économise la bande passante en ne retransmettant que les headers essentiels.

---

## 5.3 Simulation de cache dans le navigateur

1. Ouvrez DevTools > Network
2. Chargez une page avec des images
3. Rechargez avec `F5` et observez `(from cache)`
4. Rechargez avec `Ctrl + Shift + R` pour ignorer le cache

**Observations avec F5 :**
Avec `F5`, le navigateur envoie `Cache-Control: no-cache` et `Pragma: no-cache` dans la requête. Les fichiers reçoivent `Cache-Control: public, max-age=0`, donc ils peuvent être stockés, mais ils doivent être revalidés avant d'être réutilisés.

**Observations avec Ctrl + Shift + R :**
Avec `Ctrl + Shift + R`, le navigateur force le rechargement complet. Les ressources comme `index.html`, `style.css`, `script.js` et `image.png` sont redemandées au serveur au lieu d'être utilisées directement depuis le cache.

---

## Exercice

Créez une page HTML avec :

- Une image
- Un fichier CSS
- Un fichier JS

Configurez les headers de cache appropriés pour chaque type de fichier.

**Structure proposée :**

```text
tp5-cache/
├── index.html
├── style.css
├── script.js
└── image.png
```

**Headers de cache proposés :**

| Fichier      | Header de cache                           | Explication                                                                           |
| ------------ | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| `index.html` | `Cache-Control: no-cache`                 | Le HTML doit être revalidé pour récupérer rapidement les changements de page.         |
| `style.css`  | `Cache-Control: public, max-age=31536000` | Le CSS peut être gardé longtemps si le nom du fichier change quand le contenu change. |
| `script.js`  | `Cache-Control: public, max-age=31536000` | Le JS peut être mis en cache longtemps s'il est versionné.                            |
| `image.png`  | `Cache-Control: public, max-age=31536000` | Les images changent rarement, donc elles peuvent être gardées longtemps en cache.     |

---

# Exercices Récapitulatifs

## Exercice 1 : Client HTTP minimaliste

Créez un script JavaScript qui :

- Affiche un formulaire avec URL, méthode, body
- Envoie la requête
- Affiche le statut, headers et corps de la réponse

**Code HTML / JavaScript :**

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Client HTTP minimaliste</title>
  </head>
  <body>
    <form id="form">
      <input id="url" value="https://jsonplaceholder.typicode.com/posts/1" />
      <select id="method">
        <option>GET</option>
        <option>POST</option>
        <option>PUT</option>
        <option>DELETE</option>
      </select>
      <textarea id="body" placeholder="Body JSON"></textarea>
      <button type="submit">Envoyer</button>
    </form>

    <pre id="result"></pre>

    <script>
      document
        .getElementById("form")
        .addEventListener("submit", async (event) => {
          event.preventDefault();

          const url = document.getElementById("url").value;
          const method = document.getElementById("method").value;
          const bodyValue = document.getElementById("body").value;

          const options = {
            method,
            headers: {
              "Content-Type": "application/json",
            },
          };

          if (bodyValue && method !== "GET") {
            options.body = bodyValue;
          }

          const response = await fetch(url, options);
          const text = await response.text();
          const headers = [...response.headers.entries()];

          document.getElementById("result").textContent =
            "Status: " +
            response.status +
            "\n\n" +
            "Headers:\n" +
            JSON.stringify(headers, null, 2) +
            "\n\n" +
            "Body:\n" +
            text;
        });
    </script>
  </body>
</html>
```

**Résultat :**

```text
Le formulaire permet de saisir une URL, une méthode HTTP et un body JSON.
Après l'envoi, la page affiche le code de statut, les headers et le corps de la réponse.
```

---

## Exercice 2 : Questions théoriques

### 1. Quelle est la différence entre `no-cache` et `no-store` ?

**Réponse :**
`no-cache` autorise le navigateur à stocker la réponse, mais il doit demander au serveur si elle est encore valide avant de la réutiliser.

`no-store` interdit complètement le stockage de la réponse. Le navigateur ne doit pas la garder en cache.

### 2. Pourquoi `POST` n'est-il pas idempotent ?

**Réponse :**
`POST` n'est pas idempotent parce que plusieurs requêtes identiques peuvent créer plusieurs ressources ou déclencher plusieurs actions. Par exemple, envoyer deux fois le même formulaire peut créer deux commandes.

### 3. Que se passe-t-il si le serveur renvoie un code `301` ?

**Réponse :**
Le code `301 Moved Permanently` indique que la ressource a changé d'adresse de façon permanente. Le navigateur peut rediriger automatiquement vers la nouvelle URL et mémoriser cette redirection.

### 4. À quoi sert le header `Origin` ?

**Réponse :**
Le header `Origin` indique l'origine de la requête, c'est-à-dire le protocole, le domaine et le port de la page qui fait la demande. Il est surtout utilisé avec CORS pour décider si une requête cross-origin est autorisée.

### 5. Pourquoi utiliser `HttpOnly` sur les cookies de session ?

**Réponse :**
`HttpOnly` empêche JavaScript d'accéder au cookie. Cela protège les cookies de session contre le vol en cas de faille XSS.
