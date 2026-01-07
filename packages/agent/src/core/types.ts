export type SourceId =
  | "aljazeera"
  | "bbc"
  | "nyt"
  | "guardian"
  | "scmp"
  | "france24";

export type NormalizedArticle = {
  source: SourceId;
  title: string;
  link: string;
  summary: string;
  content?: string;
  publishedAt: Date | null;
  guid?: string;
  authors?: string[];
  categories?: string[];
  imageUrl?: string;
};

export type RssItem = Record<string, unknown>;

export type RssSource = {
  id: SourceId;
  url: string;
  supportsReadability: boolean;
  readability?: {
    useCustomHeaders?: boolean;
    headers?: Record<string, string>;
  };
  mapItem: (item: RssItem) => NormalizedArticle | null;
};
