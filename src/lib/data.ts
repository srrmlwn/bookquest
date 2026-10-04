import { randomUUID } from "node:crypto";
import { HttpError } from "./auth";
import { one, query } from "./db";
import type { AgeBand } from "./questions";
import { STARTED_BY, HELP, ENJOYMENT, REPEAT, EXPERIMENTS, validObservationDate, type Observation } from "./pilot";

export type Child = { id: string; nickname: string; age_band: AgeBand; reading_mode: string; color: string };
export type Book = { id: string; title: string; author: string; cover: string | null; questions: string[] };
export type Quest = {
  id: string;
  child_id: string;
  goal: number;
  reward: string;
  reward_emoji: string;
  target_date: string | null;
  status: string;
  reward_given_at: string | null;
  created_at: string;
};
export type Completion = {
  id: string;
  quest_id: string;
  book_id: string;
  child_id: string;
  question_ids: string[];
  created_at: string;
};

const AGE_BANDS = ["4-5", "6-7", "8-9"];
const MODES = ["independent", "together"];
const COLORS = ["teal", "apricot", "berry", "sky", "leaf", "sun"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function str(v: unknown, max: number, field: string, required = true): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (required && !s) throw new HttpError(400, `${field}_required`);
  if (s.length > max) throw new HttpError(400, `${field}_too_long`);
  return s;
}

function id(v: unknown, field = "id"): string {
  if (typeof v !== "string" || !UUID.test(v)) throw new HttpError(400, `bad_${field}`);
  return v;
}

function oneOf(v: unknown, allowed: string[], field: string): string {
  if (typeof v !== "string" || !allowed.includes(v)) throw new HttpError(400, `bad_${field}`);
  return v;
}

// ---------- Kid Mode reads ----------

export async function kidChildren(familyId: string) {
  return query<Child & { goal: number | null; done: number; reward: string | null; reward_emoji: string | null }>(
    `SELECT c.id, c.nickname, c.age_band, c.reading_mode, c.color,
            q.goal, q.reward, q.reward_emoji,
            (SELECT count(*)::int FROM completions x WHERE x.quest_id = q.id) AS done
       FROM children c
       LEFT JOIN quests q ON q.child_id = c.id AND q.status = 'active'
      WHERE c.family_id = $1
      ORDER BY c.created_at`,
    [familyId],
  );
}

export async function kidState(familyId: string, childId: string) {
  id(childId, "child");
  const child = await one<Child>(
    "SELECT id, nickname, age_band, reading_mode, color FROM children WHERE id = $1 AND family_id = $2",
    [childId, familyId],
  );
  if (!child) throw new HttpError(404, "child_not_found");
  const quest = await one<Quest>(
    "SELECT * FROM quests WHERE child_id = $1 AND family_id = $2 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
    [childId, familyId],
  );
  let books: (Book & { done: boolean })[] = [];
  let done = 0;
  if (quest) {
    books = await query<Book & { done: boolean }>(
      `SELECT b.id, b.title, b.author, b.cover, b.questions,
              EXISTS (SELECT 1 FROM completions x WHERE x.quest_id = $1 AND x.book_id = b.id) AS done
         FROM quest_books qb JOIN books b ON b.id = qb.book_id
        WHERE qb.quest_id = $1 AND b.family_id = $2
        ORDER BY b.title`,
      [quest.id, familyId],
    );
    done = books.filter((b) => b.done).length;
  }
  const recent = await query<{ question_ids: string[] }>(
    "SELECT question_ids FROM completions WHERE child_id = $1 AND family_id = $2 ORDER BY created_at DESC LIMIT 3",
    [childId, familyId],
  );
  return {
    child,
    quest: quest
      ? { id: quest.id, goal: quest.goal, reward: quest.reward, reward_emoji: quest.reward_emoji, done }
      : null,
    books,
    recentQuestionIds: recent.flatMap((r) => r.question_ids),
  };
}

/** Record a finished book. Idempotent: the same quest + book never counts twice. */
export async function completeBook(familyId: string, childId: string, body: Record<string, unknown>) {
  id(childId, "child");
  const questId = id(body.questId, "quest");
  const bookId = id(body.bookId, "book");
  const completionId = id(body.completionId, "completion");
  const questionIds = Array.isArray(body.questionIds)
    ? body.questionIds.filter((q): q is string => typeof q === "string").slice(0, 5)
    : [];

  const ok = await one(
    `SELECT 1 FROM quests q JOIN quest_books qb ON qb.quest_id = q.id
      WHERE q.id = $1 AND q.child_id = $2 AND q.family_id = $3 AND q.status = 'active' AND qb.book_id = $4`,
    [questId, childId, familyId, bookId],
  );
  if (!ok) throw new HttpError(400, "book_not_in_quest");

  await query(
    `INSERT INTO completions (id, family_id, quest_id, book_id, child_id, question_ids)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (quest_id, book_id) DO NOTHING`,
    [completionId, familyId, questId, bookId, childId, JSON.stringify(questionIds)],
  );
  const row = await one<{ id: string }>("SELECT id FROM completions WHERE quest_id = $1 AND book_id = $2", [
    questId,
    bookId,
  ]);
  const progress = await one<{ done: number; goal: number }>(
    "SELECT (SELECT count(*)::int FROM completions WHERE quest_id = $1) AS done, goal FROM quests WHERE id = $1",
    [questId],
  );
  return { completionId: row?.id, done: progress?.done ?? 0, goal: progress?.goal ?? 0 };
}

// ---------- Grown-up mode ----------

export async function grownupData(familyId: string) {
  const [children, books, quests, questBooks, completions, observations] = await Promise.all([
    query<Child>(
      "SELECT id, nickname, age_band, reading_mode, color FROM children WHERE family_id = $1 ORDER BY created_at",
      [familyId],
    ),
    query<Book>("SELECT id, title, author, cover, questions FROM books WHERE family_id = $1 ORDER BY title", [
      familyId,
    ]),
    query<Quest>(
      `SELECT id, child_id, goal, reward, reward_emoji, to_char(target_date, 'YYYY-MM-DD') AS target_date,
              status, reward_given_at, created_at
         FROM quests WHERE family_id = $1 ORDER BY created_at DESC`,
      [familyId],
    ),
    query<{ quest_id: string; book_id: string }>(
      "SELECT qb.quest_id, qb.book_id FROM quest_books qb JOIN quests q ON q.id = qb.quest_id WHERE q.family_id = $1",
      [familyId],
    ),
    query<Completion>(
      "SELECT id, quest_id, book_id, child_id, question_ids, created_at FROM completions WHERE family_id = $1 ORDER BY created_at DESC",
      [familyId],
    ),
    query<Observation>(
      "SELECT id, child_id, to_char(observed_on, 'YYYY-MM-DD') AS observed_on, started_by, help_needed, enjoyment, repeat_quest, experiment, notes, created_at FROM pilot_observations WHERE family_id = $1 ORDER BY observed_on DESC, created_at DESC LIMIT 200",
      [familyId],
    ),
  ]);
  return { children, books, quests, questBooks, completions, observations };
}

async function owned(table: "children" | "books" | "quests" | "completions", rowId: string, familyId: string) {
  const r = await one(`SELECT 1 FROM ${table} WHERE id = $1 AND family_id = $2`, [rowId, familyId]);
  if (!r) throw new HttpError(404, "not_found");
}

function bookFields(b: Record<string, unknown>) {
  const cover = typeof b.cover === "string" && b.cover ? b.cover : null;
  if (cover && (!cover.startsWith("data:image/") || cover.length > 400_000)) throw new HttpError(400, "bad_cover");
  const questions = Array.isArray(b.questions)
    ? b.questions
        .filter((q): q is string => typeof q === "string" && !!q.trim())
        .slice(0, 2)
        .map((q) => q.trim().slice(0, 200))
    : [];
  return {
    title: str(b.title, 120, "title"),
    author: str(b.author, 120, "author", false),
    cover,
    questions,
  };
}

export async function grownupOp(familyId: string, body: Record<string, unknown>) {
  const op = body.op;
  switch (op) {
    case "addObservation": {
      const childId = id(body.child_id, "child");
      await owned("children", childId, familyId);
      if (!validObservationDate(body.observed_on)) throw new HttpError(400, "bad_observed_on");
      const options = (v: unknown, list: readonly (readonly [string, string])[], field: string) =>
        oneOf(
          v,
          list.map(([key]) => key),
          field,
        );
      const observationId = randomUUID();
      await query(
        "INSERT INTO pilot_observations (id, family_id, child_id, observed_on, started_by, help_needed, enjoyment, repeat_quest, experiment, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [
          observationId,
          familyId,
          childId,
          body.observed_on,
          options(body.started_by, STARTED_BY, "started_by"),
          options(body.help_needed, HELP, "help_needed"),
          options(body.enjoyment, ENJOYMENT, "enjoyment"),
          options(body.repeat_quest, REPEAT, "repeat_quest"),
          options(body.experiment, EXPERIMENTS, "experiment"),
          str(body.notes, 500, "notes", false),
        ],
      );
      return { id: observationId };
    }
    case "deleteObservation": {
      await query("DELETE FROM pilot_observations WHERE id=$1 AND family_id=$2", [id(body.id), familyId]);
      return;
    }
    case "addChild":
    case "updateChild": {
      const nickname = str(body.nickname, 30, "nickname");
      const age = oneOf(body.age_band, AGE_BANDS, "age_band");
      const mode = oneOf(body.reading_mode, MODES, "reading_mode");
      const color = COLORS.includes(String(body.color)) ? String(body.color) : "teal";
      if (op === "addChild") {
        await query(
          "INSERT INTO children (id, family_id, nickname, age_band, reading_mode, color) VALUES ($1,$2,$3,$4,$5,$6)",
          [randomUUID(), familyId, nickname, age, mode, color],
        );
      } else {
        const cid = id(body.id);
        await owned("children", cid, familyId);
        await query(
          "UPDATE children SET nickname=$3, age_band=$4, reading_mode=$5, color=$6 WHERE id=$1 AND family_id=$2",
          [cid, familyId, nickname, age, mode, color],
        );
      }
      return;
    }
    case "deleteChild": {
      const cid = id(body.id);
      await owned("children", cid, familyId);
      await query("DELETE FROM children WHERE id=$1 AND family_id=$2", [cid, familyId]);
      return;
    }
    case "addBook": {
      const f = bookFields(body);
      const bookId = randomUUID();
      await query(
        "INSERT INTO books (id, family_id, title, author, cover, questions) VALUES ($1,$2,$3,$4,$5,$6::jsonb)",
        [bookId, familyId, f.title, f.author, f.cover, JSON.stringify(f.questions)],
      );
      return { id: bookId };
    }
    case "updateBook": {
      const bid = id(body.id);
      await owned("books", bid, familyId);
      const f = bookFields(body);
      await query("UPDATE books SET title=$3, author=$4, cover=$5, questions=$6::jsonb WHERE id=$1 AND family_id=$2", [
        bid,
        familyId,
        f.title,
        f.author,
        f.cover,
        JSON.stringify(f.questions),
      ]);
      return;
    }
    case "deleteBook": {
      const bid = id(body.id);
      await owned("books", bid, familyId);
      await query("DELETE FROM books WHERE id=$1 AND family_id=$2", [bid, familyId]);
      return;
    }
    case "saveQuest": {
      const childId = id(body.child_id, "child");
      await owned("children", childId, familyId);
      const goal = Number(body.goal);
      if (!Number.isInteger(goal) || goal < 1 || goal > 50) throw new HttpError(400, "bad_goal");
      const reward = str(body.reward, 80, "reward");
      const emoji = str(body.reward_emoji, 8, "reward_emoji", false) || "🎁";
      const target =
        typeof body.target_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.target_date) ? body.target_date : null;
      const bookIds = Array.isArray(body.book_ids) ? body.book_ids.map((b) => id(b, "book")) : [];
      if (bookIds.length) {
        const n = await one<{ n: number }>(
          "SELECT count(*)::int AS n FROM books WHERE family_id = $1 AND id = ANY($2::uuid[])",
          [familyId, bookIds],
        );
        if ((n?.n ?? 0) !== new Set(bookIds).size) throw new HttpError(400, "bad_book");
      }
      let questId: string;
      if (body.id) {
        questId = id(body.id, "quest");
        await owned("quests", questId, familyId);
        await query(
          "UPDATE quests SET goal=$3, reward=$4, reward_emoji=$5, target_date=$6 WHERE id=$1 AND family_id=$2",
          [questId, familyId, goal, reward, emoji, target],
        );
        // Keep completed books on the shelf so progress is never lost.
        await query(
          `DELETE FROM quest_books WHERE quest_id = $1 AND NOT (book_id = ANY($2::uuid[]))
             AND book_id NOT IN (SELECT book_id FROM completions WHERE quest_id = $1)`,
          [questId, bookIds],
        );
      } else {
        // One active quest per child: archive any existing one.
        await query("UPDATE quests SET status='archived' WHERE child_id=$1 AND family_id=$2 AND status='active'", [
          childId,
          familyId,
        ]);
        questId = randomUUID();
        await query(
          "INSERT INTO quests (id, family_id, child_id, goal, reward, reward_emoji, target_date) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [questId, familyId, childId, goal, reward, emoji, target],
        );
      }
      for (const b of new Set(bookIds)) {
        await query("INSERT INTO quest_books (quest_id, book_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [questId, b]);
      }
      return { id: questId };
    }
    case "archiveQuest": {
      const qid = id(body.id, "quest");
      await owned("quests", qid, familyId);
      await query("UPDATE quests SET status='archived' WHERE id=$1 AND family_id=$2", [qid, familyId]);
      return;
    }
    case "rewardGiven": {
      const qid = id(body.id, "quest");
      await owned("quests", qid, familyId);
      await query(
        "UPDATE quests SET reward_given_at = CASE WHEN $3::boolean THEN now() ELSE NULL END WHERE id=$1 AND family_id=$2",
        [qid, familyId, body.given !== false],
      );
      return;
    }
    case "undoCompletion": {
      const cid = id(body.id, "completion");
      await owned("completions", cid, familyId);
      await query("DELETE FROM completions WHERE id=$1 AND family_id=$2", [cid, familyId]);
      return;
    }
    default:
      throw new HttpError(400, "unknown_op");
  }
}
