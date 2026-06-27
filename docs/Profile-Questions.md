# Profile Questions

When players join a game, they answer these 10 questions about themselves. Their answers become the correct answers that others must guess — and also the distractors for other players' questions.

---

## The 10 Questions

| # | Question |
|---|---|
| 1 | What is your favorite food? |
| 2 | What is your biggest pet peeve? |
| 3 | What is your dream vacation destination? |
| 4 | What did you want to be when you grew up? |
| 5 | What is your hidden talent? |
| 6 | How many cups of coffee or tea do you drink per day? |
| 7 | What is your most-used emoji? |
| 8 | What is your go-to karaoke song? |
| 9 | What is the weirdest food you actually enjoy? |
| 10 | What is your spirit animal? |

---

## Tips for Good Answers

- **Be specific** — "spicy Korean fried chicken" beats "chicken"
- **Be honest** — the game is most fun when answers are genuinely surprising
- **Keep it short** — answers display on small phone screens, so under ~40 characters is ideal
- **PG-rated** — this is a work game night!

---

## Customising the Questions

To change the questions, edit both files (they must stay in sync):

```
server/questions.js    ← server uses this to build game rounds
client/src/questions.js ← client uses this to render the profile form
```

Both files export the same array of 10 strings:

```js
const QUESTIONS = [
  "What is your favorite food?",
  "What is your biggest pet peeve?",
  // ... add or replace questions here
];
```

> **Keep exactly 10 questions.** The profile form and answer key system (`q0`–`q9`) are built around 10 entries. If you change the count, also update the profile form validation in `client/src/screens/ProfileSetup.jsx`.
