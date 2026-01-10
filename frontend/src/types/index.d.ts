export type Recommendation = {
  id: number;
  name: string;
  ingredients?: string[]; // optional, because categories may not have ingredients
  type: "category" | "personal" | "category_based"; // matches backend type
};