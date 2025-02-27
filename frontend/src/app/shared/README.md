# Shared Module Components and Services

This directory contains shared components and services that can be used throughout the application.

## Theme System

The theme system in CodeStrata uses a combination of Angular Material themes and Tailwind CSS with a geological-themed color palette.

### Theme Service

The `ThemeService` (`services/theme.service.ts`) handles:

- Light/dark mode toggling
- Persistence of user theme preferences
- System preference detection
- Theme class application to the DOM

### Theme Toggle Component

The `ThemeToggleComponent` (`components/theme-toggle/theme-toggle.component.ts`) provides a UI element for toggling between light and dark modes.

## Usage

### Using the Theme Toggle

Simply add the component to your template:

```html
<app-theme-toggle></app-theme-toggle>
```

### Using the Theme Service

Inject the service where needed:

```typescript
constructor(private themeService: ThemeService) {}

// Check current theme
const isDarkMode = this.themeService.isDarkMode();

// Toggle theme
this.themeService.toggleTheme();

// Set specific theme
this.themeService.setTheme('dark');

// Subscribe to theme changes
this.themeService.currentTheme$
  .pipe(takeUntil(this.destroy$))
  .subscribe(theme => {
    // Handle theme change
  });
```

## Styling with the Theme

### CSS Variables

The theme provides CSS variables that can be used in your styles:

```css
.my-element {
  color: var(--strata-primary);
  background-color: var(--surface-light);
}

/* Dark mode styles */
:host-context(.dark) .my-element {
  color: var(--strata-primary-light);
  background-color: var(--strata-gray-800);
}
```

### Tailwind Classes

Use Tailwind's dark mode variants for easy theming:

```html
<div class="bg-white text-strata-gray-800 dark:bg-strata-gray-800 dark:text-strata-gray-100">
  Content with dark mode support
</div>
```

## Customizing the Theme

To customize the theme:

1. Edit the color values in `frontend/src/styles/custom-theme.scss` for Angular Material
2. Edit the color values in `frontend/tailwind.config.js` for Tailwind
3. Update CSS variables in both files to maintain consistency 