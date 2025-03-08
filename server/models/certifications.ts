export interface Certification {
  certification: string;
  meaning: string;
  order: number;
}

export const movieCertifications: Certification[] = [
  { certification: 'NR', meaning: 'Not Rated', order: 0 },
  { certification: 'G', meaning: 'General Audience', order: 1 },
  { certification: 'PG', meaning: 'Parental Guidance Suggested', order: 2 },
  { certification: 'PG-13', meaning: 'Parents Strongly Cautioned', order: 3 },
  { certification: 'R', meaning: 'Restricted', order: 4 },
  { certification: 'NC-17', meaning: 'Adults Only', order: 5 },
];

export const tvCertifications: Certification[] = [
  { certification: 'NR', meaning: 'Not Rated', order: 0 },
  { certification: 'TV-Y', meaning: 'All Children', order: 1 },
  { certification: 'TV-Y7', meaning: 'Older Children', order: 2 },
  { certification: 'TV-G', meaning: 'General Audience', order: 3 },
  { certification: 'TV-PG', meaning: 'Parental Guidance Suggested', order: 4 },
  { certification: 'TV-14', meaning: 'Parents Strongly Cautioned', order: 5 },
  { certification: 'TV-MA', meaning: 'Mature Audience', order: 6 },
];
