---
version: alpha
name: "ARKE Portal"
description: "A high-trust, information-dense learning operations portal for students, parents, teachers, and super administrators."
colors:
  navy: "#0B132B"
  gold: "#C99A2E"
  background: "#F8FAFC"
  surface: "#FFFFFF"
  text: "#1E293B"
  danger: "#EF4444"
  warning: "#F59E0B"
  success: "#10B981"
typography:
  sans:
    fontFamily: "Mulish, Inter, system-ui, sans-serif"
  display:
    fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
rounded:
  DEFAULT: "0.75rem"
  sm: "0.375rem"
  lg: "1rem"
spacing:
  page-max: "80rem"
  section-gap: "2rem"
components:
  button: {}
  card: {}
  input: {}
  table: {}
---

# ARKE Portal Design System

## Overview

### Creative North Star

ARKE should feel like a well-run coaching institute's academic register: calm navy structure, gold used only for meaningful progress and priority, and dense information that remains legible under pressure.

### Product context and register

- **Audience and primary job:** Students and parents monitor learning progress; teachers operate batches; administrators manage academic operations.
- **Target market(s):** India, based on the INR fee flow and Indian school/coaching terminology in the maintained requirements.
- **Locale(s) and language policy:** English interface with plain-language labels; dates and fees use Indian conventions.
- **Usage scene:** Mobile checks by parents/students and desktop operations by teachers/admins.
- **Register:** Product. Familiar controls and clear status are more important than decorative expression.
- **Memorable signature:** Topic health uses the red/yellow/green learning signal consistently from analysis through remediation.
- **Restraint:** Avoid dashboard decoration that competes with attendance, performance, fees, or urgent actions.
- **Anti-references:** Do not resemble a generic crypto dashboard or a playful consumer social product.
- **Token ownership/runtime mapping:** `src/app/globals.css` and `tailwind.config.js` are the runtime token owners; this document records their current values.

## Colors

Navy (`#0B132B`) carries institutional hierarchy. Gold (`#C99A2E`) is the brand accent, not a replacement for semantic state. Red, amber, and green always pair with a written flag label and a numeric percentage.

## Typography

Use Plus Jakarta Sans for page hierarchy and Mulish for operational body text. Preserve readable labels in tables; do not rely on all-caps to distinguish critical status.

## Layout

Desktop uses a fixed sidebar and document-scrolling main content. Tables own horizontal overflow rather than forcing global fixed-height layouts. Parent and student cards collapse to a single column on small screens.

## Elevation & Depth

Cards use restrained borders and soft shadows. Dialogs and active navigation may have stronger elevation; static informational blocks should not.

## Shapes

Inputs and action buttons use the documented 12px default radius. Tags and compact status indicators may be pill-shaped.

## Components

### Foundational visual states

Interactive elements provide hover, focus-visible, active, disabled, and busy states. Busy buttons retain their layout while showing the shared spinner.

### Buttons and actions

Primary actions are navy/gold-derived. Danger actions are visually separated and named with their real consequence. The shared `Button` component owns busy and disabled behavior.

### Navigation and data display

Use semantic tables for read-focused admin data. Topic flags always display a label, percentage, and remedial state.

### Forms and overlays

Forms use app-owned validation, `noValidate`, visible inline errors, and no browser dialogs for destructive operations.

### Iconography

Lucide icons supplement, never replace, an action label when an action is ambiguous.

### Motion

Use short transitions for state feedback; honor reduced-motion preferences.

## Do's and Don'ts

- **Do:** Show a clear next action for a red topic: start or review the remedial work.
- **Do:** Keep role-specific data exposure minimal, especially on teacher and parent surfaces.
- **Don't:** Use color as the sole meaning of a performance state.
- **Don't:** Hide scrollbars or make dense operational screens depend on hover-only controls.
