# UI rules

Spacing lives in `src/styles/tokens.css`. Use only 4, 8, 12, 16, 24, 32, 48, and 64. Be generous.

1. Page left and right padding: 16px on phones, 24px from 600px, 32px from 900px.
2. Page top padding under the top bar: 24px on phones, 32px on desktop. Bottom padding: 48px plus the phone safe area.
3. Gap between sections: 32px on phones, 48px from 900px. Gap between cards: 24px on phones, 32px on desktop.
4. Card padding on all four sides: 16px on phones, 24px on desktop. Gap between items inside a card: 16px. Gap from a heading to its content: 12px.
5. Forms: label to a text field 8px. Label to a button 16px. Field to field 24px. Helper or error text 8px under the field.
6. Buttons and inputs: at least 44px tall, 12px top and bottom, 16px left and right. A button sits at least 16px from a label, a text line, or another field. Gap between buttons 16px. On phones, 3 or more buttons stack full width.
7. List rows and menu items: at least 44px tall, 12px top and bottom, 16px left and right, thin divider between rows.
8. Text: body 16px, smallest 14px, line height 1.5 for body and 1.25 for headings. Headings are full white. Helper text contrast at least 4.5 to 1.
9. All text is left-aligned. Center only a single logo or icon.
10. Content max width 720px, centered on desktop.
11. One Button component for every button of the same kind. No one-off styles.
12. Custom thin dark scrollbars everywhere.

## Overlays

- Dropdown options have 16px on the left and the right. The text never touches the edge.
- When a dropdown, bottom sheet, or drawer is open, the page behind does not scroll. Keep the scroll position, use `overscroll-behavior: contain`, and let the mouse wheel and touch move only the list inside. Unlock and restore the position on close.
- On desktop a dropdown opens downward under its button. Flip upward only if there is not enough room below. It never covers its own button. Its height is limited to the space available and it scrolls inside.
- From 900px the sidebar stays fixed while the page scrolls (`position: sticky`, top 0, full screen height). It scrolls on its own only if its items are too tall. Only the main content scrolls.

## Phone navigation

- No bottom tab bar. One slim top bar, 56px tall: a hamburger on the left and the words "Counter Notes".
- The hamburger opens a drawer from the left, 80% wide (max 320px), with a dark backdrop. It closes on backdrop tap, Escape, swipe left, or choosing a link. Focus is trapped inside and returns to the button.
- The drawer holds: Today, Plan, Proof, Numbers, Character, Setup (the current one in red), then the videos-per-week control and the Colton setting.
- From 900px wide, show the sidebar and hide the hamburger.
