import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const sourceKind = pgEnum("source_kind", ["youtube", "podcast", "news"]);
export const itemFormat = pgEnum("item_format", ["video", "podcast", "article"]);
export const ingestionStatus = pgEnum("ingestion_status", ["ok", "error"]);
export const editionOrigin = pgEnum("edition_origin", [
  "followed",
  "discovery",
  "contextual",
]);
export const savedStatus = pgEnum("saved_status", [
  "saved",
  "consumed",
  "removed",
]);
export const feedbackKind = pgEnum("feedback_kind", [
  "more_topic",
  "less_source",
  "not_useful",
]);
export const collectionKind = pgEnum("collection_kind", [
  "playlist",
  "watch_later",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    isAdmin: boolean("is_admin").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailUnique: unique("users_email_unique").on(table.email),
  }),
);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const youtubeAccounts = pgTable(
  "youtube_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channelId: text("channel_id"),
    channelTitle: text("channel_title"),
    email: text("email"),
    refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
    accessTokenEncrypted: text("access_token_encrypted"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    scopes: text("scopes"),
    cookieEncrypted: text("cookie_encrypted"),
    connectedAt: timestamp("connected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  },
  (table) => ({
    userUnique: unique("youtube_accounts_user_unique").on(table.userId),
  }),
);

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    playlistId: text("playlist_id").notNull(),
    title: text("title").notNull(),
    kind: collectionKind("kind").notNull(),
    itemCount: integer("item_count").notNull().default(0),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userPlaylistUnique: unique("collections_user_playlist_unique").on(
      table.userId,
      table.playlistId,
    ),
  }),
);

export const collectionItems = pgTable(
  "collection_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    videoId: text("video_id").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    channelTitle: text("channel_title"),
    durationSeconds: integer("duration_seconds"),
    position: integer("position").notNull().default(0),
    addedAt: timestamp("added_at", { withTimezone: true }),
  },
  (table) => ({
    collectionVideoUnique: unique("collection_items_unique").on(
      table.collectionId,
      table.videoId,
    ),
  }),
);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: sourceKind("kind").notNull(),
    title: text("title").notNull(),
    feedUrl: text("feed_url").notNull(),
    siteUrl: text("site_url"),
    isFollowed: boolean("is_followed").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    isHidden: boolean("is_hidden").notNull().default(false),
    maxItemsPerEdition: integer("max_items_per_edition").notNull().default(2),
    weight: real("weight").notNull().default(1),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    lastStatus: ingestionStatus("last_status"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userFeedUnique: unique("sources_user_feed_unique").on(
      table.userId,
      table.feedUrl,
    ),
  }),
);

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    summary: text("summary"),
    author: text("author"),
    format: itemFormat("format").notNull(),
    durationSeconds: integer("duration_seconds"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    contentHash: text("content_hash").notNull(),
  },
  (table) => ({
    sourceExternalUnique: unique("items_source_external_unique").on(
      table.sourceId,
      table.externalId,
    ),
    userCanonicalUnique: unique("items_user_canonical_unique").on(
      table.userId,
      table.canonicalUrl,
    ),
  }),
);

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    isIncluded: boolean("is_included").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userNameUnique: unique("topics_user_name_unique").on(
      table.userId,
      table.name,
    ),
  }),
);

export const itemTopics = pgTable(
  "item_topics",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    score: real("score").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.itemId, table.topicId] }),
  }),
);

export const preferences = pgTable(
  "preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").$type<unknown>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userKeyUnique: unique("preferences_user_key_unique").on(
      table.userId,
      table.key,
    ),
  }),
);

export const dailyEditions = pgTable(
  "daily_editions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    editionDate: date("edition_date").notNull(),
    algorithmVersion: text("algorithm_version").notNull(),
    size: integer("size").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userDateVersionUnique: unique("daily_editions_user_date_version_unique").on(
      table.userId,
      table.editionDate,
      table.algorithmVersion,
    ),
  }),
);

export const editionItems = pgTable(
  "edition_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => dailyEditions.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    origin: editionOrigin("origin").notNull(),
    score: real("score").notNull(),
    signalBreakdown: jsonb("signal_breakdown")
      .$type<Record<string, number>>()
      .notNull(),
    reason: text("reason").notNull(),
    position: integer("position").notNull(),
  },
  (table) => ({
    editionItemUnique: unique("edition_items_unique").on(
      table.editionId,
      table.itemId,
    ),
  }),
);

export const savedItems = pgTable(
  "saved_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    status: savedStatus("status").notNull().default("saved"),
    note: text("note"),
    savedAt: timestamp("saved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (table) => ({
    itemUnique: unique("saved_items_item_unique").on(table.itemId),
  }),
);

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  kind: feedbackKind("kind").notNull(),
  topicId: uuid("topic_id").references(() => topics.id, {
    onDelete: "set null",
  }),
  sourceId: uuid("source_id").references(() => sources.id, {
    onDelete: "set null",
  }),
  confirmed: boolean("confirmed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ingestionRuns = pgTable("ingestion_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => sources.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: ingestionStatus("status"),
  itemsFound: integer("items_found").notNull().default(0),
  itemsNew: integer("items_new").notNull().default(0),
  error: text("error"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type YoutubeAccount = typeof youtubeAccounts.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type CollectionItem = typeof collectionItems.$inferSelect;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Topic = typeof topics.$inferSelect;
export type DailyEdition = typeof dailyEditions.$inferSelect;
export type EditionItem = typeof editionItems.$inferSelect;
export type SavedItem = typeof savedItems.$inferSelect;
export type FeedbackRow = typeof feedback.$inferSelect;
