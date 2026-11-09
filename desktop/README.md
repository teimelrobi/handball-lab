# KéziStat Desktop – első fejlesztési alap

Ez egy **kísérleti Electron-burkolat** a meglévő KéziStat webes felülethez. Nem kész offline-szinkronizáció és nem kiadott Windows-telepítő.

## Indítás fejlesztői gépen
1. Telepítsd a Node.js LTS változatát.
2. A projekt gyökerében: `npm install`
3. Indítás: `npm run desktop`
4. Windows telepítő készítése: `npm run desktop:pack` (Windows környezetben)

## Jelenlegi korlátok
- A program a meglévő `index.html` felületet futtatja helyi, csak a saját gépen elérhető HTTP-szerveren.
- Az alapfelület hálózat nélkül megnyílhat, de a külső CDN-es JavaScript/CSS, Supabase-bejelentkezés, MKSZ-adatimport és Google Drive hozzáférés **online függőségek**. Ezek offline helyettesítése még nincs kész.
- A böngészős KéziStat adatai **nem jelennek meg automatikusan** a Desktopban: eltérő helyi tárhelyet használ. Ne tekintsd ezt migrációnak.
- Nincs még offline változásnapló, konfliktuskezelés, Drive-szinkronizáció, helyi FFmpeg vagy automatikus frissítő.
- A Drive-feltöltés fejlesztése külön PR-ben (#7) folyik; ez az ág nem tartalmazza automatikusan.
- A meglévő felhőadatokat és a webes éles alkalmazást ez a változtatás nem módosítja.

## Következő fejlesztések
1. Külső CDN függőségek helyi csomagolása és az offline felület ellenőrzése.
2. Tartós helyi projekt-/videótár és offline módosításnapló.
3. Drive kapcsolat + kétirányú szinkron és konfliktuskezelés.
4. Natív, helyi videóexport és tesztelt Windows telepítő.
