# **App Name**: ChronoClicker

## Core Features:

- Core Gameplay Loop: Click button increases resource points. Displays points, points per second, upgrade stats, character stats and resource costs.
- Generators & Resources Display: Displays resource generation from generators (upgrades) which increase PPS (points per second). PPS = Σ(upgrade.pps × upgrade.qty) × character.bonus. Includes a 'More Info' popup.
- Achievement System: Achievement triggers for milestone events, granting item, point and permanent boost rewards from JSON config.
- Inventory System: Inventory management system for dropped items, which can be equipped, consumed or passive, with max equipped items limited by character. Drops defined in config JSON.
- Character System: User can switch characters who grant name, PPS bonus, Drop rate boost and Item slots. RandomDrop chance = baseChance × character.dropRateBoost.
- Game Save System: Game save system: Auto-save to localStorage. Option to export to / import from file.
- Loot Generator: LLM evaluates all drop rates across multiple GeneratorTotalPurchases tools, decides when it makes sense to give a drop.

## Style Guidelines:

- Primary color: Saturated purple (#9D4EDD) to evoke a sense of magic and progression. 
- Background color: Light desaturated purple (#EEE9F6) to provide a soft, unobtrusive backdrop.
- Accent color: Soft pink (#E951B4) for highlighting interactive elements.
- Headline font: 'Space Grotesk' (sans-serif) for headlines; body font: 'Inter' (sans-serif) for body text. A clean and modern aesthetic is conveyed.
- Code font: 'Source Code Pro' (monospace) for displaying JSON data structures.
- Vertical tabs on the left side for navigation; Resource Details bar at the top displaying resources; stats dashboard on a secondary tab for detailed analytics; 'Use Multiplier' buttons next to the main call-to-action.
- Simple, outlined icons for generators, resources, and inventory items. 'More Info' button on generators, items and characters