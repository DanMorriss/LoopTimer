# Planning

Built (PLN-1–3): a weekly plan of which workouts you do on which days, the same every week, on a Plan page from the Library; this week's progress on it there; and what's due today on Home. Kept simple on purpose: no multi-week programmes.

## Stories

- **PLN-1** As a user I want to set which workouts I do on which days of the week.
- **PLN-2** As a user I want Home to show what's due today, ready to start.
- **PLN-3** As a user I want to see whether I kept to the plan this week.

## Rules

### The plan (PLN-1)

- One plan, of seven days, **Monday to Sunday**, each with any number of workouts from the library (up to 10), in the order they were added. A workout can be on several days, but only once on each.
- It's the same every week: nothing moves or carries over.
- **Plan**, a button beside + New at the top of the Library (once there's a workout), opens the **Plan page** at `/plan`. It slides in over the Library, as an exercise does over the Exercises list; **‹ Library** or a swipe right goes back. The Library tab stays chosen while it's open.
- Top to bottom: ‹ Library, the title **Plan**, "Which workouts you do on which days, the same every week. What's due shows on Home.", how this week's going (see below), then a section per day, each with its name (today's says "· today"), **Add**, and its workouts, or "Nothing planned".
- **Add** opens a dialog, "Plan on Thursday", listing the library's workouts in the library's order; one already planned that day says "Planned" and can't be picked. Picking one adds it to the end of the day, and focus goes back to that day's Add. ✕, Escape or a tap outside close it, focus back on Add.
- **✕** by a workout ("Take Legs off Saturday" to screen readers) takes it off that day straight away; focus goes to that day's Add.
- Screen readers hear each change: "Push planned on Thursday", "Legs taken off Saturday".
- With an empty library, it says "Make a workout in the library first, then plan it here." and there's no Add.
- A workout deleted from the library drops out of the plan wherever it was.
- The plan is your data: saved on the device, in backups, and synced, as one record of its own (like the library's order), so planning on one device and editing a workout on another don't overwrite each other. The plan changed most recently wins.

### This week (PLN-3)

- Each workout on the Plan page says where it is this week, Monday to Sunday by the device's calendar:
    - **✓ Done**: it was run on that day, finished or stopped.
    - **Missed**: its day has gone by without it; its name is dimmed. A missed workout stays missed: it doesn't move to the next day.
    - **Due**: it's today's, and not run yet today.
    - Nothing: its day is still to come.
- Running a workout on a different day from the one it's planned on doesn't count for its planned day.
- Above the days: "**1 of 4 done so far this week**", counting the workouts planned up to and including today. Nothing's said with none planned so far this week.

### Due today (PLN-2)

- On **Home**, first under the logo: a **Due today** card listing today's planned workouts not yet run today, in the plan's order, each with **Start**. The first's Start is the page's main button; the others' are smaller.
- When some have been run today: "Done today: Legs" under the list. When all have: "✓ All done: Push, Legs" in place of the list.
- While any are due, the **suggested next workout** isn't shown: the plan says what's next. It's back once they're all done, or on a day with nothing planned.
- With nothing planned today, there's no card, and Home is as it was.

## Acceptance criteria

- Given Legs and Push in the library, when I open Plan from the Library, press Add on Thursday and pick Push, then Thursday lists Push, focus is on Thursday's Add, and screen readers hear "Push planned on Thursday".
- Given Legs planned on Thursday, when I press Add on Thursday, then Legs says "Planned" and can't be picked.
- Given Legs planned on Saturday, when I press its ✕, then Saturday says "Nothing planned".
- Given today is Wednesday and Legs on Monday (run Monday evening), Push on Tuesday (run on Wednesday instead), and Legs and Push today, when I open Plan, then Monday's Legs is Done, Tuesday's Push is Missed, today's Legs is Due, and it says "1 of 4 done so far this week".
- Given Legs planned on Friday and then deleted from the library, then Friday says "Nothing planned".
- Given Push and Legs planned today, when I open Home, then Due today lists Push then Legs, each with Start (Push's the main button), and there's no suggested workout; when I've run Legs, then only Push is listed, with "Done today: Legs"; when I've run both, then it says "All done: Push, Legs" and the suggested workout is back.
- Given nothing planned today, when I open Home, then there's no Due today.
- Given a plan changed on this device after one on my other device, when they sync, then both have this one.

## Platform notes

- **Web:** the plan is `WeekPlan` in `src/app/models/plan.ts`, with `thisWeek()` and `dueToday()` working out where each planned workout is from the history, by the device's calendar (`weekdayOf()`, `startOfWeek()`). It's kept by `PlanStore` (`src/app/shared/state/plan-store.service.ts`) in localStorage as `week-plan`, each change dated by the sync clock. It syncs as the record of kind `plan`, id `week` (`src/app/sync/sync-records.ts`), and is `plan` in backups from version 13. The page is `PlanComponent` (`src/app/plan/`), and Home's card `DueTodayComponent` (`src/app/home/due-today/`). Picking a workout uses `WorkoutChoiceDialogComponent` (`src/app/shared/components/workout-choice-dialog/`), shared with an exercise's Add to workout.
- **iOS:** the page maps onto a `List` with a `Section` per day and `.swipeActions` (or an ✕ button) to take a workout off; Add onto a `.sheet` or `Menu` of the library's workouts. The week starts on Monday whatever the device's `Calendar` says, as on the web. Due today is a section at the top of the home view.
