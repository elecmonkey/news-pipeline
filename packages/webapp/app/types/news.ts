export type RunListItem = {
  id: string;
  windowStart: string;
  windowEnd: string;
  createdAt: string;
  eventCount: number;
};

export type RunListResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  runs: RunListItem[];
};

export type EventReference = {
  source: string;
  title: string;
  link: string;
  publishedAt: string | null;
  content: string | null;
};

export type RunEvent = {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  references: EventReference[];
};

export type RunDetail = {
  id: string;
  windowStart: string;
  windowEnd: string;
  createdAt: string;
  events: RunEvent[];
};
