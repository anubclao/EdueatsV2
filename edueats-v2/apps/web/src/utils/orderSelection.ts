export const NO_SELECTION_PREFIX = '__NO_SELECTION__::';

export const makeNoSelectionRecipeId = (categoryId: string) => `${NO_SELECTION_PREFIX}${categoryId}`;

export const isNoSelectionRecipeId = (recipeId?: string | null) =>
  typeof recipeId === 'string' && recipeId.startsWith(NO_SELECTION_PREFIX);
