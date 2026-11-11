# Outfit Saver

A React Native (Expo) app for planning what to wear. Photograph your clothes and accessories, build outfits from them, and plan your outfits on a calendar.

## Features

- **Closet**: take a photo (or pick one from your library) of each piece and tag it as Tops, Bottoms, Dresses, Outerwear, Shoes or Accessories. You can filter by category, rename items, recategorize them or delete them.
- **Outfit builder**: tap items from each category to put a look together, name it and save it. **Shuffle** fills the builder with a random combination.
- **Today**: shows today's planned outfit, or press **Shuffle an outfit** for a random suggestion (a dress, or a top and bottom, plus shoes, sometimes a layer and accessories). You can wear it, tweak it or shuffle again.
- **Calendar**: a month view showing a thumbnail for every day that has an outfit planned. Tap a day to assign, swap or remove an outfit.

Everything stays on your device. Photos are copied into the app's private documents folder, and closet data is stored with AsyncStorage. There are no accounts or servers.

## Run it

```bash
npm install
npx expo start
```

To run it on your phone, scan the QR code with the **Expo Go** app (Android) or the Camera app (iOS). Press `w` to open a web preview in your browser.

For a standalone build, run `npx eas-cli@latest build --profile preview`.

## Project layout

```
src/app/            Screens (Expo Router: every file is a route)
  (tabs)/           Today, Closet, Outfits, Calendar tabs
  add-item.tsx      Camera / photo-library capture
  item/[id].tsx     Item details
  outfit/[id].tsx   Outfit builder ("new" creates one)
src/components/     Shared UI pieces
src/lib/            Data store, persistence, shuffle logic, theme
```

Typecheck with `npm run typecheck`.
