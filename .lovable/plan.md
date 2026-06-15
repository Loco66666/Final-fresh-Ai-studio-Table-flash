# Refonte Catégories & Menus

Deux concepts distincts, deux modèles, deux UI.

## 1. Catégories personnalisées (par restaurant)

### Base de données

Nouvelle table `menu_categories` :

- `restaurant_id` (FK), `name`, `position` (int), `created_at`, `updated_at`
- Unicité `(restaurant_id, name)`
- RLS : lecture publique (menu client), écriture réservée aux membres du restaurant
- GRANT à `anon` (SELECT), `authenticated` (CRUD via policy), `service_role`

Migration de données :

- Pour chaque restaurant, créer les catégories à partir des `products.category` existantes (DISTINCT), avec une position par défaut
- La colonne `products.category` (texte) reste pour compat — sert de "nom de catégorie"
- Plus tard : passer à `products.category_id` (hors scope de ce plan, garde la compat texte)

### UI Menu

- Remplacer la liste figée `cats` par la liste chargée depuis `menu_categories`
- Pastille "Toutes" + catégories du restaurant (avec compteurs déjà en place)
- Bouton "⚙ Gérer les catégories" qui ouvre une feuille (sheet) :
  - Liste réordonnable par drag & drop (`@dnd-kit/core` + `sortable`)
  - Renommer en place (les produits liés sont renommés en cascade)
  - Supprimer (bloqué si produits liés, ou propose réassignation)
  - Ajouter une catégorie
- Le sélecteur de catégorie dans `ProductFormSheet` devient un Select alimenté par `menu_categories` + option "+ Nouvelle catégorie"

### Tri produits

- `products` triés par `position` de la catégorie puis par `position` produit

## 2. Menus / Formules (concept séparé)

### Base de données

Deux tables :

`menus` :

- `restaurant_id`, `name` (ex: "Menu du midi"), `description`, `price` (numeric), `status` ('actif'|'inactif'), `available_days` (text[]), `available_from` (time), `available_to` (time), `position`, `image_url`
- RLS membres du restaurant + lecture publique pour les actifs

`menu_items` (composition d'un menu) :

- `menu_id`, `course` ('entree'|'plat'|'dessert'|'boisson'|'autre'), `label` (ex: "Au choix parmi"), `position`
- `menu_item_choices` : `menu_item_id`, `product_id` (FK products), `extra_price` (default 0)

GRANT + RLS standards (SELECT anon sur menus actifs uniquement, CRUD membres).

### UI

- Nouvelle route `/_app/menus` (liste des menus/formules) + bouton "Créer un menu"
- Nouvelle entrée dans la nav latérale ou un toggle haut de page Menu (`Produits` | `Menus`)
- Éditeur de menu (`MenuFormSheet`) :
  - Infos : nom, prix, image, jours/horaires de disponibilité
  - Composition : sections (Entrée / Plat / Dessert…) où chaque section liste des choix de produits piochés dans le catalogue, avec supplément optionnel par choix
- Vue client `/t/$tableId` : ajoute un onglet "Formules" qui affiche les menus actifs avec leur composition

## Étapes d'implémentation

1. **Migration DB** (categories + menus + menu_items + menu_item_choices + GRANTs + RLS + backfill catégories depuis l'existant)
2. **Module catégories**
   - `src/lib/categories.functions.ts` (`listCategories`, `createCategory`, `renameCategory`, `reorderCategories`, `deleteCategory`)
   - `src/components/CategoryManagerSheet.tsx` (drag & drop dnd-kit)
   - Brancher dans `_app.menu.tsx` (chargement dynamique, bouton "Gérer", select dans `ProductFormSheet`)
3. **Module menus**
   - `src/lib/menus.functions.ts` (CRUD menus + composition)
   - `src/components/MenuFormSheet.tsx` (éditeur)
   - `src/routes/_app.menus.tsx` (liste + création)
   - Toggle `Produits | Menus` sur la page menu, ou nouvelle entrée nav
4. **Vue client** : afficher la section Formules dans `t.$tableId`
5. **Nettoyage** : retirer définitivement la liste `cats` figée

## Technique

- Drag & drop : `@dnd-kit/core` + `@dnd-kit/sortable` (déjà compatibles React 19, légers)
- Persistance ordre : update batch des `position` (1 requête `upsert` par catégorie réordonnée)
- L'IA scanner mappe désormais ses catégories détectées sur les catégories existantes du restaurant (fuzzy match), sinon en crée à la volée
- Compat : la colonne texte `products.category` reste la source de vérité dans cette itération ; rename catégorie = `UPDATE products SET category = new WHERE category = old AND restaurant_id = X`

## Questions ouvertes

- Veux-tu un onglet `Produits | Menus` sur la page actuelle, ou une entrée distincte dans la nav du bas ?
- Pour les menus : prix fixe unique ou aussi "menu à la carte" (prix calculé) ? Je pars sur prix fixe simple, suppléments par choix.
- Les menus doivent-ils apparaître côté client comme des "cartes" (image + prix + composition dépliable), validé ?
