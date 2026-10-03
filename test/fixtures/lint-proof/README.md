Deliberately unsafe code, kept as proof that the linter catches it (Oct 3, 2026).
Copy `unsafe-example.js` into `public/` and run `npm run lint`: it fails on innerHTML, eval and new Function.
This folder is ignored by ESLint, so the normal lint run stays green. Never imported or served.
