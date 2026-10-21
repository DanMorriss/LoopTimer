# Planning

Planned, after progress and sync (see [direction](../direction.md)). Kept simple on purpose: no multi-week programmes. Rules are a first draft.

## Stories

- **PLN-1** As a user I want to set which workouts I do on which days of the week.
- **PLN-2** As a user I want the home page to show what's due today, ready to start.
- **PLN-3** As a user I want to see whether I kept to the plan this week.

## Rules (draft)

- A plan is a list of weekdays, each with any number of workouts. One plan at a time.
- **Due today (PLN-2):** today's workouts, minus any already done today. With nothing planned, the home page is as it is now.
- **This week (PLN-3):** planned workouts done or not, Monday to Sunday, shown with the history's "Last 7 days" summary.

## Open questions

- Should a missed workout move to the next day, or just show as missed?
- Should the week start on Monday or follow the device's locale?
