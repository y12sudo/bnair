# Outfit Saver

A React Native (Expo) app for planning what to wear. Photograph your clothes and accessories, build outfits from them, and plan your outfits on a calendar.

## Features

- **Frosted-glass design** in the style of recent iOS: translucent materials over a slowly drifting colour backdrop, large titles, a floating tab bar with a sliding highlight, and a separate camera button. It follows the phone's light/dark setting.
- **Today**: a greeting, the local weather with a styling tip, and a **swipeable deck** of outfit suggestions made from your own clothes. Swipe right (or tap ♥) to wear one, or left to skip.
- **Weather-aware shuffle**: cold or rainy days always get a layer, hot days skip it. Weather comes from Open-Meteo (free, no key) using your approximate location. If you deny location, the card hides and shuffling still works.
- **Flat-lay boards**: every outfit is laid out like a styled flat lay, with the main piece in the middle, a jacket peeking out behind, shoes at the foot and accessories down the side. Items spring into place as you build.
- **Closet**: a camera viewfinder with a shutter button, category tiles, and a filterable grid with staggered animations. Each piece has a detail page with stats (looks, days planned).
- **Looks** (saved outfits) and **Plan** (a month calendar where each styled day shows its outfit as a photo).
- **Haptics** on taps, swipes past the threshold, saves and deletes, plus spring press animations throughout.

Everything stays on your device. Photos are copied into the app's private documents folder, and closet data is stored with AsyncStorage. The only network request is the weather lookup.

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
src/components/     Glass UI kit, FlatLay board, SwipeDeck, floating TabBar
src/lib/            Data store, persistence, weather, shuffle logic, theme, haptics
```

Typecheck with `npm run typecheck`.
