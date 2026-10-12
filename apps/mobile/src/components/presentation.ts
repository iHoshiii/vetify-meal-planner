/** Presentation copy only. Calculations and eligibility rules stay in shared code. */
const feedingCopy: Record<string, string> = {
  'Confirm a current weight and feeding assessment to estimate daily targets.':
    'Set a target using a current weight and health check.',
  'Automatic daily targets support adult dogs and cats only.':
    'Daily targets are available for adult dogs and cats.',
  'Pregnancy, nursing or an unknown reproductive status needs a reviewed plan.':
    'Confirm pregnancy or nursing status with your vet.',
  'Automatic targets are for weight maintenance only.':
    'Weight gain or loss needs a reviewed feeding plan.',
  'Health conditions or food reactions need a reviewed food plan.':
    'Ask your vet to review health conditions or food reactions.',
  'Confirm the neuter status before estimating a daily target.': 'Confirm spay or neuter status.',
  'This starting estimate requires ordinary, moderate activity.':
    'This activity level needs a reviewed feeding plan.',
  'Growing or young dogs need an individual reviewed feeding plan.':
    'Growing dogs need an individual feeding plan.',
  'Growing or young cats need an individual reviewed feeding plan.':
    'Growing cats need an individual feeding plan.',
  'Cats aged seven or older need an individual feeding review in this release.':
    'Older cats need an individual feeding plan.',
  'Confirm normal muscle condition; muscle loss needs an individual feeding review.':
    'Confirm muscle condition with your vet.',
  'Measure the dog again before estimating daily targets.': 'Update the weight measurement.',
  'Measure the cat again before estimating daily targets.': 'Update the weight measurement.',
  'Health concerns or a prescribed diet need a reviewed feeding plan.':
    'Ask your vet to review this diet.',
  'Recent appetite or weight changes need a feeding review.':
    'Ask your vet about recent appetite or weight changes.',
  'Confirm a body condition score of 4 or 5 out of 9.':
    'This body condition needs a reviewed feeding plan.',
  'This energy intake needs a reviewed nutrient-density profile.':
    'Ask your vet to review the calorie allowance.',
  'This energy intake needs a reviewed feline nutrient-density profile.':
    'Ask your vet to review the calorie allowance.',
  'Use a suitable complete adult food with its label calories.':
    'Choose a complete adult food and enter its label calories.',
  'Record the calorie label source and date checked.': 'Enter the label source and check date.',
  'Enter daily calories from treats, including 0 if none.': 'Enter treat calories, or 0 for none.',
  'This amount was entered by you. Vetify has not calculated it.':
    'Using your existing daily amount.',
  'This food is not confirmed complete.': 'Food completeness is not confirmed.',
  'Check that this food suits this pet.': 'Check the food species.',
  'Calories from treats and extras are unknown.': 'Treat calories are unknown.',
};

export function feedingMessage(message: string): string {
  return feedingCopy[message] ?? message;
}

export function userMessage(
  message?: string,
  fallback = 'Something went wrong. Try again.',
): string {
  const text = message?.trim() ?? '';
  if (!text) return '';
  if (/failed to fetch|network request failed|networkerror|econn\w+|enotfound/i.test(text))
    return 'Unable to connect. Check your connection and try again.';
  if (
    /https?:\/\/|mongodb(?:\+srv)?:\/\/|[a-z]:[\\/]|node_modules|\b(?:TypeError|SyntaxError|ReferenceError|MongoServer\w*|stack trace)\b|unexpected token|unexpected end of json|\[object Object\]|^invalid (?:input|option|type):|^too (?:small|big):|unrecognized key/i.test(
      text,
    )
  )
    return fallback;
  return text;
}

export function shortDate(date: string): string {
  const value = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(value.getTime())
    ? value.toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric' })
    : date;
}

export function foodNotesText(notes: string, builtIn: boolean): string {
  if (!builtIn) return notes;
  return notes
    .replace(/^USDA [\s\S]*?\(first page = 1\)\.\s*/, '')
    .replace(
      'Per 100 g edible portion; human-food energy estimate, not verified feline ME.',
      'Calories are estimates.',
    )
    .replace(
      'Supplemental extra only; all extras together should stay within 10% of daily calories.',
      'Keep extras within 10% of daily calories.',
    )
    .replace(
      'Not a complete feline diet; taurine and other unlisted nutrients are unknown.',
      'Taurine and other unlisted nutrients are unknown.',
    );
}
