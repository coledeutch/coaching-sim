/** Everything the game can teach and track mastery for. Each topic points to the lesson that teaches it. */
export interface Topic {
  id: string;
  name: string;
  group: 'Reading the defense' | 'Coverages' | 'Concepts' | 'Quarterbacking';
  lessonId: string;
}

export const TOPICS: Topic[] = [
  { id: 'shell', name: 'Shells (1-high / 2-high)', group: 'Reading the defense', lessonId: 'reading-defense' },
  { id: 'numbering', name: 'Receiver numbering', group: 'Reading the defense', lessonId: 'reading-defense' },
  { id: 'conflict', name: 'Conflict defenders', group: 'Reading the defense', lessonId: 'conflict' },
  { id: 'cover3', name: 'Cover 3', group: 'Coverages', lessonId: 'cover3' },
  { id: 'cover2', name: 'Cover 2', group: 'Coverages', lessonId: 'cover2' },
  { id: 'tampa2', name: 'Tampa 2', group: 'Coverages', lessonId: 'cover2' },
  { id: 'cover4', name: 'Cover 4 (Quarters)', group: 'Coverages', lessonId: 'quarters' },
  { id: 'cover1', name: 'Cover 1', group: 'Coverages', lessonId: 'man-pressure' },
  { id: 'cover2man', name: '2-Man', group: 'Coverages', lessonId: 'quarters' },
  { id: 'cover0', name: 'Cover 0', group: 'Coverages', lessonId: 'man-pressure' },
  { id: 'smash', name: 'Smash', group: 'Concepts', lessonId: 'smash' },
  { id: 'fourVerts', name: 'Four Verticals', group: 'Concepts', lessonId: 'cover3' },
  { id: 'stick', name: 'Stick', group: 'Concepts', lessonId: 'conflict' },
  { id: 'curlFlat', name: 'Curl-Flat', group: 'Concepts', lessonId: 'conflict' },
  { id: 'slantFlat', name: 'Slant-Flat', group: 'Concepts', lessonId: 'man-pressure' },
  { id: 'flood', name: 'Flood', group: 'Concepts', lessonId: 'cover3' },
  { id: 'mesh', name: 'Mesh', group: 'Concepts', lessonId: 'man-pressure' },
  { id: 'dagger', name: 'Dagger', group: 'Concepts', lessonId: 'quarters' },
  { id: 'protection', name: 'Protection & hot reads', group: 'Quarterbacking', lessonId: 'man-pressure' },
  { id: 'progression', name: 'Progressions', group: 'Quarterbacking', lessonId: 'progressions' },
];

export const topicById = (id: string) => TOPICS.find((t) => t.id === id);
