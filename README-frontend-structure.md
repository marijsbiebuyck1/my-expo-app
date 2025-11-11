# Frontend structure: gebruiker vs admin

## Doel

Net zoals op de backend hebben we een duidelijke scheiding aangebracht tussen 'gebruiker' en 'admin' binnen de frontend-app (`my-expo-app`), zonder bestaande bestanden inhoudelijk te wijzigen.

## Wat is gedaan

- Nieuwe wrapper/re-export bestanden toegevoegd onder:
  - `app/users/...` en `app/admin/...` voor pagina's en tab-structuren.
  - `components/users/...` en `components/admin/...` voor componenten.

## Hoe het werkt

- De wrapperbestanden zijn kleine re-exports die verwijzen naar de bestaande pagina/componentbestanden. Dit geeft je meteen een duidelijke mapstructuur in de editor (bijv. `app/users`, `app/admin`) zonder dat imports elders in de projectcode hoeven te veranderen.
- Voor componenten die named exports gebruiken (bijv. `export function ExternalLink`), heb ik `export * from '...'` gebruikt zodat alle named exports beschikbaar zijn. Voor componenten met een default export (bijv. `export default function SwipeCard`) heb ik `export { default } from '...'` gebruikt.

## Volgende opties

- Als je wilt kan ik de wrapperbestanden vervangen door daadwerkelijke verplaatsing van bestanden naar de nieuwe mappen en automatisch alle importpaden bijwerken.
- We kunnen ook de admin-pagina's/UX aanpassen (bijv. aparte admin layout, menu, of role-based routing) en auth toevoegen.

## Problemen om op te merken

- TypeScript/linters kunnen warnings tonen voor sommige re-exports (bijv. wanneer een module alleen named exports heeft en je `export { default }` gebruikt of vice versa). Ik heb de wrappers zo ingesteld dat ze corresponderen met de daadwerkelijke exporttypes, maar als je strict lintregels hebt kan het nodig zijn om kleine aanpassingen te maken.
