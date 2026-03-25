# Design System Document: Financial Fluidity

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Private Vault"**

This design system rejects the "noisy" aesthetic of traditional fintech. Instead of cluttered dashboards and rigid borders, we lean into **Soft Minimalism**. The goal is to create an interface that feels like a high-end, physical concierge service—quiet, authoritative, and frictionless. 

We break the "template" look by utilizing **intentional asymmetry** in chat bubbles and **tonal depth** in card nesting. By combining the conversational ease of WhatsApp with the structural precision of Google Pay, we achieve a "Fluid Utility" where the UI breathes. We prioritize high-contrast typography and generous negative space to ensure that even complex financial data feels approachable.

---

## 2. Colors & Tonal Architecture
We move beyond flat hex codes to a system of "Environmental Light."

### The "No-Line" Rule
**Strict Mandate:** Traditional 1px solid borders are prohibited for sectioning. 
Structure must be defined through **Background Color Shifts**. For example, a transaction history list (Surface-Container-Low) should sit on the main background (Surface) without a stroke. The eye should perceive the change in depth through the shift from `#111417` to `#191C1F`, not a line.

### Surface Hierarchy & Nesting
Treat the UI as stacked sheets of obsidian glass.
*   **Base Layer:** `surface` (#111417) – The canvas.
*   **Secondary Layer:** `surface-container-low` (#191C1F) – For grouping related chat messages.
*   **Priority Layer:** `surface-container-high` (#272A2E) – For active CTA containers or "Action Sheets."

### The "Glass & Signature" Rule
*   **Glassmorphism:** Use `surface-bright` (#37393D) at 60% opacity with a `24px` backdrop blur for floating navigation bars or sticky headers. This allows the primary blue (`#3F51B5`) of chat bubbles to bleed through subtly as the user scrolls.
*   **Signature Textures:** Main Action Buttons (CTAs) should not be flat. Apply a subtle linear gradient from `primary` (#BAC3FF) to `primary_container` (#3F51B5) at a 135-degree angle to give the button a "weighted" feel.

---

## 3. Typography: Editorial Authority
We pair the geometric precision of **Manrope** for high-level data with the hyper-readability of **Inter** for conversational UI.

*   **Display & Headlines (Manrope):** Large, bold, and expressive. Use `display-lg` (3.5rem) for account balances to make the "Money" the hero of the screen.
*   **Body & Labels (Inter):** Used for chat bubbles and transaction metadata. `body-md` (0.875rem) is the workhorse for chat logs.
*   **Hierarchy Note:** Use `on_surface_variant` (#C5C5D4) for timestamps and secondary labels. The high contrast between `on_surface` (near-white) and `on_surface_variant` creates an editorial "rhythm" that guides the eye without needing bold weights.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "web 2.0." We use **Ambient Shadows** and **Tonal Stacking**.

*   **The Layering Principle:** To lift a card, place a `surface-container-highest` (#323538) card on top of a `surface` (#111417) background. The 4-step jump in the container scale provides a natural, physical lift.
*   **Ambient Shadows:** For floating elements (like a "Send Money" FAB), use a blur of `40px` and an opacity of `8%`. The shadow color must be the `primary_container` (#3F51B5) color, creating a blue-tinted glow that mimics the screen's light.
*   **The "Ghost Border" Fallback:** If a container absolutely requires a boundary (e.g., in a high-density table), use the `outline_variant` (#454652) at **15% opacity**. It should be felt, not seen.

---

## 5. Components: Fluid Primitives

### Chat Bubbles (The Signature Component)
*   **Sent Messages:** `primary_container` (#3F51B5) with `on_primary_container` (#CACFFF) text. 
*   **Received Messages:** `surface_container_high` (#272A2E).
*   **Styling:** Use `DEFAULT` (1rem / 16px) rounding for the outer corners, but `sm` (0.5rem) for the corner pointing toward the user's avatar to create an asymmetric "speech" look.

### Buttons & Chips
*   **Primary Button:** Gradient-filled (Primary to Primary Container). Corner radius: `full` (9999px) for a modern, pebble-like feel.
*   **Fintech Chips:** Use `tertiary_container` (#00691B) with `on_tertiary_container` (#83E881) for positive "Money Received" statuses. No border; just a soft color pill.

### Input Fields
*   **The "Zero-Gravity" Input:** No bottom line or box. Use a `surface_container_lowest` (#0B0E11) fill with a `md` (1.5rem) corner radius. The input field should look like a carved-out portion of the interface.

### The "Transaction Card" (Specialty Component)
*   **Requirement:** Forbid divider lines between transactions. 
*   **Execution:** Use `spacing.8` (2rem) of vertical white space between groups (e.g., "Today" vs "Yesterday") and `spacing.2` (0.5rem) between individual items. Use a `surface_container_low` background on hover/press states only.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use `tertiary` (#78DC77) for all successful financial confirmations. It provides a "High-Trust" green that pops against the dark indigo theme.
*   **Do** use `spacing.10` (2.5rem) as your standard side margin. Generous gutters are the secret to a "premium" feel.
*   **Do** lean into the `xl` (3rem) corner radius for top-level modal sheets to create a soft, welcoming entry.

### Don’t
*   **Don't** use pure black (#000000). It kills the depth of the indigo shadows. Always stay within the `surface` palette.
*   **Don't** use 1px dividers. If you feel the UI is "bleeding together," increase the contrast between your `surface` and `surface_container` levels.
*   **Don't** use high-saturation reds for errors. Use `error_container` (#93000A) to keep the dark-mode harmony intact while signaling caution.