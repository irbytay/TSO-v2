# Aromaland mobile storefront concept

This is a local, mobile-first CEO review shell. It follows the same low-complexity handoff pattern as TSO-v2: plain static files, no package install, and ready to place at a repository root. It uses sample data, CSS-created visuals, and no live commerce systems. There is no checkout, order processing, customer account, or payment collection.

## Phased plan

1. **Scope and references** — confirm the exact GitHub repository, Cloudflare target, approved logo/images/fonts, and any current brand guidelines.
2. **Responsive shell** — build and review the local mock catalog, mobile navigation, shopping paths, Find Your Scent flow, sample product detail, and demo bag. *(Current phase.)*
3. **Preview deployment** — connect the confirmed GitHub repo to a separate Cloudflare Pages/Workers preview project and publish a non-production URL.
4. **CEO test and feedback** — collect notes on navigation, copy, visual direction, assortment, and recommendation logic; revise the shell.
5. **Integration assessment** — only after approval, map and test BigCommerce read APIs/webhooks and evaluate whether a companion app adds value.

## Future BigCommerce integration contract

BigCommerce remains the source of truth. Employees continue maintaining products in their existing admin. The storefront reads a normalized view; it does not create a second inventory system.

| Storefront field | Expected BigCommerce source | Employee-maintained? | Purpose |
|---|---|---:|---|
| `id`, `sku`, `name` | Product core fields | Yes | Identity and display |
| `slug`, `is_visible`, `availability` | Product core fields | Yes | Routing and eligibility |
| `price`, `sale_price`, `currency` | Price lists/product | Yes | Display pricing |
| `images[]`, `alt_text` | Product images | Yes | Authorized product media |
| `description`, `ingredients`, `directions`, `warnings` | Product description/custom fields | Yes | Accurate product facts and safe use |
| `product_type` | Category or custom field | Yes | Oil, blend, mist, bath/body, accessory |
| `purpose_tags[]` | Category/metafield | Yes | Browsing context such as home fragrance |
| `scent_family[]` | Category/metafield | Yes | Floral, citrus, earthy, herbaceous, etc. |
| `aroma_notes[]` | Metafield/custom field | Yes | Concrete scent profile |
| `recommendation_copy` | Metafield | Yes, reviewed | Plain-language reason for a match |
| `claim_review_status` | Metafield/workflow | Yes, controlled | Prevent unapproved claims from surfacing |
| `inventory_status` | BigCommerce inventory | System-managed | Availability only; never duplicated locally |

Recommendation rule example: when a visitor chooses `purpose = home fragrance` and `scent_family = floral`, rank visible products carrying both tags, then fall back to floral products. The explanation should reference those tags and aroma notes only. It should never infer or promise medical, therapeutic, or physiological outcomes.

## Review locally

Serve this folder with any static web server and open `index.html`. The shell has no build step or dependencies.

For deployment, copy this folder's contents to the root of the confirmed repository. A separate Cloudflare preview project can publish that repository with no build command and `/` as the output directory. `_headers` prevents indexing and disables unnecessary browser capabilities. Access protection, if desired, should be configured at Cloudflare rather than added to the storefront code.

The shell now includes a complete concept-menu translation of the public Aromaland catalog: Essential Oils, Massage, Bath & Body, Hair Care, and Home Fragrance, with every current subcategory represented. Selected official imagery is stored locally under `assets/images`; provenance and pre-production approval notes are recorded in `assets/IMAGE-SOURCES.md`.

## Decisions needed before phase 3

- Exact GitHub repository (existing URL/name, or approval to create a new one)
- Exact Cloudflare account/project target and whether it should be Pages or Workers
- Approved Aromaland logo, product images, fonts, and brand-color references
- Preferred access level for the CEO preview (public unlisted URL or protected preview)
