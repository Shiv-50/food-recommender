export type Recommendation = {
  id: number;
  name: string;
  ingredients?: string[]; // optional, because categories may not have ingredients
  type: "category" | "personal" | "category_based"; // matches backend type
};

export type Stats = {
  total_swipes: number;
  left_swipes: number;
  right_swipes: number;
  insights: string;
};
