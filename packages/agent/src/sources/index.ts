import type { RssSource } from "../core/types";
import { aljazeeraSource } from "./aljazeera";
import { bbcSource } from "./bbc";
import { guardianSource } from "./guardian";
import { nytSource } from "./nyt";
import { scmpSource } from "./scmp";
import { unNewsSource } from "./unNews";

export const sources: RssSource[] = [
  aljazeeraSource,
  bbcSource,
  guardianSource,
  nytSource,
  scmpSource,
  unNewsSource,
];
