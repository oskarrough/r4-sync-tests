The app follows a few guidelines and preferences when it comes to design and styling with CSS.

- Keep consistent defaults, and allow customizations
- CSS variables for most things

Everything has to work in both light and dark mode.

We define four variables:

- gray-light, gray-dark
- accent-light, accent-dark

and from those we generate two scales of 12 colors each:

```
--gray-1 to --gray-12
--accent-1 to --accent-12
```

See the following files:

- variables.css
- color-scales.css
