# Rules & Scoring

## Player Roles

### Host
- Creates the room and shares the room code
- Also fills in a profile and plays like everyone else
- Has two extra controls: **Start Game** and **Next Round** buttons

### Players
- Join with the room code
- Fill in 10 profile answers before the game
- Guess the subject's answer each round
- Cannot guess during rounds when they are the subject

---

## The Subject

Each round, one player is randomly chosen as the **subject**. Their answer to one of their profile questions is the correct answer that round.

The subject:
- Sees their own answer on screen
- Watches how many people have guessed
- **Cannot guess** (they'd always know the right answer!)
- Earns a **mystery bonus** for each wrong guess (see below)

---

## Scoring

### Speed-based scoring (Kahoot-style)

Correct answers score between **500 and 1000 points** depending on how quickly you answered:

| When you answered | Points earned |
|---|---|
| Instantly | 1,000 pts |
| Halfway through the timer | 750 pts |
| Last second | 500 pts |
| Wrong answer | 0 pts |

**Formula:** `points = round(1000 × (1 − (timeTaken / 20s) × 0.5))`

The minimum for any correct answer is always **500 points** — no one is punished too harshly for taking their time.

### Mystery Bonus (for the subject)

The subject earns **+25 points for every wrong guess** made about them. The more mysterious your answers, the more you score when you're in the spotlight!

---

## Game Structure

- **20 rounds** total per game
- Subjects are picked randomly — not every player will be the subject every round
- Questions are shuffled from each player's 10-answer profile pool
- The same question can appear multiple times across the game (once per player)

---

## Room Rules

- Minimum **4 players** required to start (needed for 3 real distractors per question)
- Maximum **18 players** per room
- Players who join before the game starts and submit their profile are in — late joiners cannot join mid-game
- If a player disconnects during the game, the game continues without them
