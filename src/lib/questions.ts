// Buddy's static question pool. No AI in v1: questions are general enough to fit
// any story, and grown-ups can add up to 2 book-specific questions per book.

export type AgeBand = "4-5" | "6-7" | "8-9";
export type QType = "story" | "character" | "feelings" | "favorite" | "imagine";

export type Question = {
  id: string;
  type: QType;
  /** Youngest age band this question suits. */
  minAge: AgeBand;
  text: string;
};

export const POOL: Question[] = [
  // story: openers about what happened
  { id: "s1", type: "story", minAge: "4-5", text: "Tell me about your book! What was it about?" },
  { id: "s2", type: "story", minAge: "4-5", text: "What happened in your book? Tell me the story." },
  { id: "s3", type: "story", minAge: "4-5", text: "Who was in your book, and what did they do?" },
  { id: "s4", type: "story", minAge: "4-5", text: "How did your book begin?" },
  { id: "s5", type: "story", minAge: "4-5", text: "How did your book end?" },
  { id: "s6", type: "story", minAge: "6-7", text: "What was the big problem in the story? How did it get fixed?" },
  { id: "s7", type: "story", minAge: "6-7", text: "If you told a friend about this book in one minute, what would you say?" },
  { id: "s8", type: "story", minAge: "6-7", text: "What happened in the middle of the book?" },
  { id: "s9", type: "story", minAge: "8-9", text: "What changed between the beginning and the end of the story?" },
  { id: "s10", type: "story", minAge: "8-9", text: "Where and when did the story happen? How could you tell?" },

  // character
  { id: "c1", type: "character", minAge: "4-5", text: "Who was your favorite character? Why?" },
  { id: "c2", type: "character", minAge: "4-5", text: "Which character would you like to be friends with?" },
  { id: "c3", type: "character", minAge: "4-5", text: "Was there a silly character in your book? What did they do?" },
  { id: "c4", type: "character", minAge: "6-7", text: "Did a character make a choice you didn't agree with? What would you have done?" },
  { id: "c5", type: "character", minAge: "6-7", text: "What was the main character really good at?" },
  { id: "c6", type: "character", minAge: "6-7", text: "Did a character help someone? How?" },
  { id: "c7", type: "character", minAge: "6-7", text: "What did the main character want most?" },
  { id: "c8", type: "character", minAge: "8-9", text: "Did any character change during the story? How were they different at the end?" },
  { id: "c9", type: "character", minAge: "8-9", text: "Why do you think a character did something surprising?" },

  // feelings
  { id: "f1", type: "feelings", minAge: "4-5", text: "How did this book make you feel?" },
  { id: "f2", type: "feelings", minAge: "4-5", text: "Was there a happy part? What happened?" },
  { id: "f3", type: "feelings", minAge: "4-5", text: "Was there a scary or sad part? What happened?" },
  { id: "f4", type: "feelings", minAge: "6-7", text: "How do you think the main character felt at the end?" },
  { id: "f5", type: "feelings", minAge: "6-7", text: "Did anything in the book surprise you?" },
  { id: "f6", type: "feelings", minAge: "6-7", text: "Has anything in this story ever happened to you, or something like it?" },
  { id: "f7", type: "feelings", minAge: "8-9", text: "Was there a moment when you were worried about a character? Why?" },

  // favorite
  { id: "v1", type: "favorite", minAge: "4-5", text: "What was your favorite part?" },
  { id: "v2", type: "favorite", minAge: "4-5", text: "Was there a picture or a moment you really liked? Tell me about it." },
  { id: "v3", type: "favorite", minAge: "4-5", text: "What was the funniest part?" },
  { id: "v4", type: "favorite", minAge: "6-7", text: "Would you read this book again? Why or why not?" },
  { id: "v5", type: "favorite", minAge: "6-7", text: "Who would you give this book to? Why would they like it?" },
  { id: "v6", type: "favorite", minAge: "6-7", text: "Out of five stars, how many would you give this book? Why?" },
  { id: "v7", type: "favorite", minAge: "8-9", text: "What's one thing you learned from this book?" },

  // imagine
  { id: "i1", type: "imagine", minAge: "4-5", text: "If you could jump into the book, what would you do there?" },
  { id: "i2", type: "imagine", minAge: "4-5", text: "What do you think happens after the story ends?" },
  { id: "i3", type: "imagine", minAge: "4-5", text: "If you could give the book a new title, what would it be?" },
  { id: "i4", type: "imagine", minAge: "6-7", text: "If you were the author, what would you change about the story?" },
  { id: "i5", type: "imagine", minAge: "6-7", text: "If a character came to our house, what would you show them?" },
  { id: "i6", type: "imagine", minAge: "6-7", text: "What question would you ask the main character?" },
  { id: "i7", type: "imagine", minAge: "8-9", text: "If there were a book two, what would happen in it?" },
  { id: "i8", type: "imagine", minAge: "8-9", text: "What would the story be like if it were told by a different character?" },
];

/** Warm, non-judging replies between questions. Never evaluate the answer. */
export const ACKS = [
  "Thanks for sharing! Here's another question.",
  "Thank you! Let's talk a little more about your book.",
  "Thanks for telling me. One more thing!",
];

const AGE_ORDER: AgeBand[] = ["4-5", "6-7", "8-9"];

function suits(q: Question, age: AgeBand) {
  return AGE_ORDER.indexOf(q.minAge) <= AGE_ORDER.indexOf(age);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function questionCount(age: AgeBand) {
  return age === "4-5" ? 2 : 3;
}

/**
 * Pick a session's questions:
 * 1. The book's grown-up questions go first.
 * 2. Fill from the pool for this age band, each a different type, opening with a story question.
 * 3. Avoid recently heard questions when possible.
 */
export function pickQuestions(age: AgeBand, bookQuestions: string[], recentIds: string[]): Question[] {
  const n = questionCount(age);
  const custom: Question[] = bookQuestions
    .filter((t) => t.trim())
    .slice(0, 2)
    .map((text, i) => ({ id: `book-${i}`, type: "story" as QType, minAge: "4-5" as AgeBand, text: text.trim() }));

  const recent = new Set(recentIds);
  const eligible = POOL.filter((q) => suits(q, age));
  const fresh = shuffle(eligible.filter((q) => !recent.has(q.id)));
  const stale = shuffle(eligible.filter((q) => recent.has(q.id)));
  const ordered = [...fresh, ...stale];

  const picked: Question[] = [];
  const usedTypes = new Set<QType>();
  const take = (q: Question) => {
    picked.push(q);
    usedTypes.add(q.type);
  };

  // Without custom questions, always open with a story question.
  if (custom.length === 0) {
    const opener = ordered.find((q) => q.type === "story");
    if (opener) take(opener);
  } else {
    usedTypes.add("story");
  }

  for (const q of ordered) {
    if (custom.length + picked.length >= n) break;
    if (picked.includes(q) || usedTypes.has(q.type)) continue;
    take(q);
  }

  return [...custom, ...picked].slice(0, Math.max(n, custom.length));
}

export function questionText(id: string): string | null {
  return POOL.find((q) => q.id === id)?.text ?? null;
}

export const BUDDY_LINES = {
  noQuest: "Hi! A grown-up will set up your reading quest soon.",
  whichBook: "Which book did you finish?",
  noBooks: "You've finished all your books! Ask a grown-up to add another one.",
  start: (title: string) => `Yay! Let's talk about ${title}.`,
  listening: "I'm listening!",
  complete: "Book complete! Great reading!",
  goal: (reward: string) => `You did it! You earned ${reward}!`,
  micHelp: "The microphone is off. You can still tell your story out loud.",
};
