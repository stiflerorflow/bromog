// Knowledge base — headline (always visible) + read-more body (expandable).
// Content is verbatim; structure only.

export interface KnowledgeEntry {
  title: string;
  headline: string;
  body: string[];
}

export interface KnowledgeSection {
  id: string;
  title: string;
  entries: KnowledgeEntry[];
}

/**
 * Compact digest of the whole Knowledge base (section → title: headline) used to
 * ground the LLM coach. The app is the single source of truth — it ships this to
 * the backend per coach request, so the coach never drifts from the framework.
 */
export function knowledgeDigest(): string {
  return KNOWLEDGE.map(
    (s) => `## ${s.title}\n` + s.entries.map((e) => `- ${e.title}: ${e.headline}`).join("\n")
  ).join("\n\n");
}

export const KNOWLEDGE: KnowledgeSection[] = [
  {
    id: "diet",
    title: "Diet",
    entries: [
      {
        title: "Finding Your Maintenance — the foundation everything rests on",
        headline:
          "Maintenance isn't a number you calculate — it's a number you discover. Get this wrong and every other effort is sabotaged.",
        body: [
          `Online calculators and formulas give you a generic estimate that ignores everything that makes your metabolism yours. Your real maintenance is found empirically: eat a set amount consistently, track weight over weeks, and read what your body actually does. That measured number is the truth; the formula is a guess.`,
          `Your maintenance runs higher than generic estimates predict, and there are real reasons: a high-protein intake has a large thermic effect (20-30% of those calories burned digesting), keeping fat low skews your macros toward higher-TEF nutrients, the whole-food plant matrix means not all calories are fully absorbed, high fiber adds to that, and high NEAT (you're fidgety, you walk a lot) plus a decent amount of muscle raise the floor further. Stack all of that and a maintenance near 3,100+ isn't surprising — it only looks high against estimates that don't account for any of your specifics.`,
          `The calibration approach: pick a number, hold it steady, read the trend over 2-3 weeks, adjust. Bookend test periods with DEXA when you want precision. The number drifts as your weight and muscle change, so re-check it periodically rather than assuming it's fixed.`,
        ],
      },
      {
        title: "The Pernicious Mini-Deficit — how accidental under-eating quietly ruins progress",
        headline:
          "A small unintended deficit while trying to build means you gain nothing — and you won't notice it's happening.",
        body: [
          `The danger isn't a big obvious deficit — you'd feel that. It's the small one you don't notice: you think you're at maintenance or slightly above, but you're actually 100-200 kcal under, every day. Muscle building stalls, but slowly enough that you blame training, genetics, or programming instead of the real cause. Weeks or months get wasted feeding a deficit you didn't know you were in.`,
          `The fix is to bias upward when uncertain. If you're unsure whether you're at maintenance or just under it, eat a bit more. The cost of a small accidental surplus (a little fat) is trivial and reversible; the cost of a chronic accidental deficit (no muscle gain, wasted training time) is large and invisible. When in doubt, err high — the asymmetry strongly favors it.`,
        ],
      },
      {
        title: "Real Surpluses Build Muscle — a 200-300 kcal surplus is the adaptation signal",
        headline:
          'Muscle adaptation wants a genuine, deliberate surplus — roughly +200-300 kcal — not "maintenance and hope."',
        body: [
          `Trying to build muscle at exact maintenance is running the engine with no fuel margin. A modest, intentional surplus of around 200-300 kcal above your verified maintenance gives the body the energy and raw materials to actually adapt to training. This is "real" surplus — calculated from your empirically-found maintenance, not from a formula's guess (which could put you in a deficit while you think you're surplus).`,
          `Keep it modest: the surplus that maximizes muscle adaptation is small. Bigger surpluses just add fat without adding muscle faster — muscle accrues at its own pace and you can't rush it with more food. The goal is the smallest surplus that reliably fuels adaptation, sustained over time. Build phases run at +200-300 from verified maintenance; the slow, steady weight gain is the signal it's working.`,
        ],
      },
      {
        title: "Whole-Food Plant-Based — the structural advantages",
        headline:
          "A whole-food plant diet isn't a handicap to work around — it's a metabolic and health edge, once protein is handled.",
        body: [
          `The food-matrix effect: nutrients wrapped in intact plant structure aren't fully absorbed the way processed calories are, and they digest slower, which blunts glycemic response and increases fullness. High fiber (50-60g+) feeds satiety and gut health and isn't fully metabolized as calories. Micronutrients come for free from the sheer volume of vegetables, fruit, and legumes — you're covered by what you eat, not by supplementing gaps. The thermic effect runs higher across a high-protein, low-fat, high-fiber pattern. Saturated fat stays naturally very low (protective over decades).`,
          `The one thing the diet demands attention on is protein — specifically leucine and distribution (see below). Handle that, and the rest of the pattern is working in your favour, not against you.`,
        ],
      },
      {
        title: 'The Cutting Confound — why "lean feels bad" is a lie',
        headline:
          "Getting lean and being lean are different states. The misery people blame on leanness actually belongs to the deficit used to get there.",
        body: [
          `There are two distinct states people constantly confuse. State A — getting lean: deep in a long deficit, glycogen-depleted, under-fuelled, hormones suppressed by ongoing restriction, mentally fried. This feels terrible — and that's where most "being lean is misery" stories come from. State B — being lean: sitting at a low body fat in energy balance, eating at maintenance, glycogen full, fuelled, hormones recovered. Same body fat, completely different experience. State B feels good.`,
          `When competitors say "I look shredded but feel like garbage and can only hold it for weeks," they're describing State A at an extreme body fat (4-5%) reached through brutal prolonged restriction. That tells you nothing about how a moderate 10-12% feels four weeks into a fed maintenance phase — which is State B, and is fine. Don't let competitor misery, which is deficit-and-depletion misery, convince you that being lean is inherently bad. Reach a sensible leanness via a comfortable cut, then live there fed and in balance.`,
        ],
      },
      {
        title: "Why 10-15% Is the Healthy Range",
        headline:
          "10-15% body fat is lean enough to look excellent and high enough to keep your hormones, mood, training, and life intact.",
        body: [
          `Below ~10% maintained year-round, real costs appear: suppressed testosterone, metabolic adaptation, impaired recovery and training quality, worse sleep, lower libido, dented immunity. Those costs bite hard at the 4-5% stage-lean extreme and are largely absent in the 10-15% range. Meanwhile, 10-15% already shows the definition and shape most people actually want.`,
          `The social-media standard (shredded year-round) is a survivorship-biased illusion — the algorithm selects for that look, so your feed massively over-represents it, making it seem normal when it's actually maintained only by drugs, genetic outliers, or people quietly suffering for content. Aiming for 10-15% sustainable beats chasing an unsustainable extreme that costs your health and is mostly an artifact of a filtered sample. Lean and well — not shredded and depleted.`,
        ],
      },
      {
        title: "Cap Cuts at ~4 Weeks",
        headline:
          "Keep cuts short — around four weeks — then return to maintenance. Short cuts dodge the problems long cuts create.",
        body: [
          `The damage of dieting accumulates with time in a deficit: metabolic adaptation deepens, hormones suppress further, recovery and training quality decline, hunger and adherence erode, and the food-relationship strain builds. A short cut (~4 weeks) takes a clean bite of fat loss before those problems compound, then you return to maintenance (State B) to recover, re-fuel, and reset before the next bite if needed.`,
          `This is the opposite of the long, grinding, perpetual deficit that wrecks people. Comfortable, well-fuelled, high-volume-eating cuts, capped at about four weeks, keep the whole process in the zone where it feels easy and sustainable rather than depleting. Multiple short cuts with maintenance phases between beat one long miserable cut, every time.`,
        ],
      },
      {
        title: "Leucine Gates — the threshold that actually triggers muscle building",
        headline: `Muscle protein synthesis is a gate, not a dial. Each meal either clears the leucine threshold and fires the "build" signal, or it doesn't.`,
        body: [
          `Muscle protein synthesis is triggered when a meal delivers enough leucine to cross a threshold — clearing the "gate." Below the threshold, the build signal barely fires; above it, you get the full response. It's binary-ish, not proportional. This is why total daily protein is a poor measure: it's the count of gates you clear per day that matters, not the sum of grams.`,
          `For a whole-food vegan this is the single most important thing to understand, because plant protein is leucine-dilute. You can hit a "good" daily protein total while clearing zero gates — exactly because the protein is spread thin across the day in lower-leucine sources, never crossing the threshold at any single meal. The fix: deliberately structured meals, each with enough protein from your sources to clear the gate. Roughly four meals of ~40-50g plant protein each clears four gates a day. (An omnivore clears the gate easily at ~30g animal protein per meal — vegans need more per meal to hit the same leucine.) Before understanding this, you were likely clearing zero or one gate a day on a perfectly respectable total. After: four clean gates, which is the actual driver.`,
        ],
      },
      {
        title: "The Refractory Period — why timing the gaps matters",
        headline:
          "After a muscle-building pulse fires, there's a refractory window where more protein won't fire another. Space your gates ~3-4 hours apart.",
        body: [
          `Once a meal clears the gate and triggers a muscle-building pulse, the muscle is briefly unresponsive to triggering another — the refractory period, roughly 3-4 hours. Protein eaten inside that window (a snack, a shake, a protein bar shortly after a meal) doesn't fire a new pulse; it just adds to the daily total without adding a gate.`,
          `This is the second reason daily total is a bad measure: protein that lands in the refractory shadow inflates your number while doing nothing for pulse count. Practically: space your four threshold meals about 3-4 hours apart so each lands on a responsive muscle and fires a clean, separate pulse. Don't cluster protein; distribute it so every gate-clearing meal actually counts. Four well-spaced gates beat the same protein crammed into two big hits or scattered with sub-threshold snacks.`,
        ],
      },
      {
        title: "Protein Total Is a Lossy Proxy — count gates, not grams",
        headline:
          "Daily protein total is a bad measure of what builds muscle. Two people with identical totals can clear wildly different numbers of leucine gates.",
        body: [
          `Total daily protein is a proxy that hides the thing that matters. It fails two ways. First, over-dosing per meal: protein above ~30-40g per sitting inflates the total without adding to that meal's muscle-building pulse — it's used for general turnover, not extra growth signal. Second, refractory-period dosing: protein eaten in the 3-4h shadow after a pulse (snacks, bars, a second helping) adds to the total but fires no new gate. So someone eating 70g × 4 meals plus protein snacks posts a huge total but clears the same 4 gates as someone eating 40g × 4 clean meals — the proxy ranks them very differently; the mechanism rates them identical. Worse, a lower total with more clean gates can beat a higher total with fewer. The number you'd optimise (grams) and the thing that actually drives growth (clean, spaced gate-crossings) only correlate by accident — which is exactly why a whole-food vegan can hit a "good" total while clearing almost no gates. Count gates, not grams.`,
        ],
      },
      {
        title: "High-Volume Eating — abundance and a deficit at the same time",
        headline:
          "Eating huge volumes of low-calorie, high-fiber, high-protein whole food lets you feel full while in a deficit. The trick that makes cutting effortless.",
        body: [
          `The reason your cuts feel effortless rather than like willpower battles: volume. A large mass of vegetables, legumes, fruit, and lean plant protein delivers enormous fullness for relatively few calories. You eat a physically large amount of food, feel genuinely stuffed, and still land in a deficit — because the calorie density is low while the fiber and protein (the most satiating components) are high.`,
          `This flips dieting from restriction to abundance. Instead of small portions and hunger, you eat more food than you might at maintenance on a worse diet, and the deficit happens via density, not via going hungry. The fiber's second-meal effect (slowed digestion, sustained fullness across meals and even overnight via gut fermentation) compounds it. This is why the framework runs on satiety rather than discipline: the food itself does the work that willpower does on a worse plan.`,
        ],
      },
    ],
  },
  {
    id: "lifting",
    title: "Lifting",
    entries: [
      {
        title: "RIR 1-3 — the intensity sweet spot",
        headline:
          "Train within 1-3 reps of failure. Same growth as going to absolute failure, far less fatigue and injury risk.",
        body: [
          `Sets need to be genuinely hard to drive growth, but they don't need to reach absolute failure. Stopping 1-3 reps short (RIR = reps in reserve) gets essentially the same hypertrophy as training to failure, while accumulating much less systemic fatigue and lowering injury risk. Going to true failure on every set is more fatiguing without being more productive — it digs a recovery hole that limits your volume and frequency.`,
          `The practical version: the set should be hard, the last reps a real grind, but you stop with 1-3 in the tank (a little closer to failure on isolations, more conservative on heavy compounds). "Hard but controlled," not "grind every set into the ground." This is what lets you sustain quality volume across the week without breaking down.`,
        ],
      },
      {
        title: "60 Hard Sets a Week — your volume target",
        headline:
          "Around 60 hard sets per week (across all muscles) is the realistic, near-optimal ceiling. More has diminishing returns not worth the life-cost.",
        body: [
          `Volume drives growth, with a dose-response that continues up to high numbers but with steeply diminishing returns — big gains accrue in the low-to-mid range per muscle, then the curve flattens. Sixty total hard sets a week, distributed across your muscles, puts each in its productive range while keeping the whole thing recoverable and life-compatible.`,
          `Past 60, you're on the flat tail of the curve: more sets cost meaningfully more time, fatigue, and recovery for ever-smaller returns. For someone with a job, a VO2max institution, sleep to protect, and a life, 60 is the point where the curve has flattened enough that more isn't worth it. It's not a compromise — it's the sensible effort-to-return ceiling. Be content with whatever physique sustained, sensible 60-set work affords over the years.`,
        ],
      },
      {
        title: "Exercise Choice — pick what you'll do hard, repeatedly",
        headline:
          "Choose exercises you genuinely like and can push hard on. Machines are fine. Variety for its own sake is pointless.",
        body: [
          `The best exercise is the one you'll perform with high intensity, consistently, without joint grief. Machines and cables are completely legitimate — set quality and the ability to push close to failure safely matter more than free-weight machismo. Pick your A/S-tier movements (the ones that hit the target well and feel good) and stick with them.`,
          `You don't need constant exercise rotation — novelty for novelty's sake adds nothing. Rotating exercises has a real but modest benefit for managing overuse and hitting angles, so swap when something nags or stalls, not on a schedule. Two sets per exercise is the efficient delivery: it lets you do more exercises (more angle/region coverage) for the same volume, keeps each set fresh, and manages fatigue and overuse — without any set being junk.`,
        ],
      },
      {
        title: "Why 2 Sets Per Exercise — the delivery method, not a magic number",
        headline:
          "Two sets per exercise isn't a volume rule — it's how you deliver volume at the highest quality, with the least junk and the lowest injury cost.",
        body: [
          `The first set of an exercise is the most stimulating; each subsequent set adds less while adding fatigue. Two sets captures most of the per-exercise stimulus without the junk-volume tail. But the real power is what two-sets lets you do: hit your weekly volume across more exercises instead of more sets-per-exercise. Same 60 sets, but spread over more movements and angles — more complete stimulus, less repetitive stress on any single joint or pattern.`,
          `It also protects intensity. With only two sets you can't pace yourself — there's no fourth set coming, so you bring real effort to both (first set leaves ~1 in the tank to gauge it, second set matches or pushes). And it manages fatigue and overuse: hammering one movement for five sets is how tendons and joints get wrecked over years; two sets across more exercises spreads the load. So two-sets is a delivery method that simultaneously raises set quality, increases exercise variety, cuts junk volume, and reduces overuse risk — not a claim that "two is the optimal number." The number is the consequence of optimising for quality and fatigue, not the goal itself.`,
        ],
      },
      {
        title: "Frequency — why hitting muscles often may be doing more than the consensus admits",
        headline:
          'The "2x a week is the ceiling" consensus isn\'t proven — it\'s just what got studied. Higher frequency on fast-recovering muscles is a sound bet.',
        body: [
          `The standard line is that training a muscle 2x/week beats 1x, but more frequency doesn't add growth when volume is equated. But that conclusion rests on what was studied, not on a demonstrated ceiling — most studies compared 1x vs 2x, and crucially they left protein distribution and meal timing uncontrolled.`,
          `Here's the mechanism: a training session sensitizes a muscle's growth response for a window (~24-72 hours). The main plausible way frequency helps is by opening more of these sensitized windows across the week. Fast-recovering muscles (biceps, triceps, side delts) can be trained 3-4x/week at low per-session volume (2 sets, fresh each time) without fatigue problems — opening more windows, more often. Distributing your volume into more frequent, fresher sessions is at worst equal to fewer long sessions (better set quality) and plausibly better. Low cost, real upside, and your fast-recovering priorities are built to exploit it.`,
        ],
      },
      {
        title: "Muscle Sensitization Period — the window training opens",
        headline:
          "A trained muscle stays primed to grow for roughly 24-72 hours, then returns to baseline. Train it again before the window fully closes.",
        body: [
          `After you train a muscle, its growth machinery is elevated and responsive — the sensitized window — for somewhere around 24-72 hours (shorter in trained lifters, longer in beginners). Outside that window the muscle sits at baseline, not actively building. If you train a muscle once a week, it spends most of the week un-sensitized — several "dead" days where it's not growing.`,
          `This is the case for frequency framed mechanistically: hitting a muscle more often keeps it in the sensitized, growth-primed state for more of the week, instead of letting the window close and the muscle idle. For fast-recovering muscles you can re-open the window every day or two, keeping them near-continuously primed. The window is also why you don't need to cram volume into one session — spreading it keeps re-opening the window with fresh, quality work.`,
        ],
      },
      {
        title: "The Gate × Sensitization Edge — feeding pulses into open windows",
        headline:
          "Frequency opens sensitized windows; leucine gates fire growth pulses. Do both, and the pulses land in primed muscle — the effects compound.",
        body: [
          `These two mechanisms aren't separate — they're one strategy. Training frequency's main job is opening sensitized windows. Leucine gates fire muscle-building pulses. The whole point of a pulse is that it should land in a muscle that's primed to use it. So you want both happening together: more frequent training (more open windows) AND four clean daily leucine gates (more pulses) — and the pulses landing inside the sensitized windows do more than the same pulses landing on idle, baseline muscle.`,
          `A fourth daily gate delivered on a day a muscle is freshly sensitized is worth more than the same protein on an untrained day. Stack more sensitized days (frequency) with more clean pulses per day (distribution), and the growth-stimulus exposure compounds — windows and pulses reinforcing each other rather than just adding up. The frequency studies that found "nothing" never controlled the feeding, so the windows they opened went unfed — which is exactly why they'd find nothing even if this is real. The strategy costs you almost nothing (you're eating the protein and doing the sessions anyway), and your whole setup — fast-recovering priorities, four gates, frequent fresh sessions — is built to capture it. This is the edge.`,
        ],
      },
      {
        title: "Specialization — the tool for later, not now",
        headline:
          "Specialization (high volume on one muscle, maintenance on the rest, rotated) reaches genetic ceiling over years. You don't need it yet.",
        body: [
          `Specialization concentrates high volume on one or two muscles for a block while the rest sit on cheap maintenance (a third of building volume holds muscle, sometimes with a re-sensitization bonus), then you rotate the focus. Over a decade, this lets a fixed 60-set budget bring every priority muscle near its genetic ceiling — reached in the time dimension (rotating focus over years) rather than by cramming maximal volume everywhere at once.`,
          `But this is an advanced-phase tool. For the next couple of years, the static 60 distributed across your muscles (with your upper bias) still drives growth everywhere — you're not close enough to any ceiling for specialization to be necessary. Adding it now would just be complexity without benefit. Ride the simple distributed approach while it works; bring in specialization later, when ordinary distributed volume starts to plateau on your priority muscles. Priority muscles for the eventual ceiling push: chest, triceps, biceps, side delts, glutes. The rest stay "very strong."`,
        ],
      },
    ],
  },
  {
    id: "cardio",
    title: "VO₂max & Cardio",
    entries: [
      {
        title: "Why VO2max Is the Highest-Leverage Health Lever",
        headline:
          "VO2max is among the strongest predictors of longevity in all of preventive health — and one weekly session defends it for a tiny time cost.",
        body: [
          `Cardiorespiratory fitness consistently out-predicts traditional risk factors for all-cause mortality, with each step up the fitness ladder associated with meaningful reductions in death risk and no clear upper limit. The evidence is observational (so the exact causal magnitude carries uncertainty), but the direction is robust and the risk-reward is extraordinary: ~25 minutes a week of hard intervals, against a plausible benefit measured in years of healthspan. When the cost is trivial and the potential upside is that large, you take the bet.`,
          `Critically, VO2max is the one fitness metric that decays without ongoing input — muscle and strength persist far longer untrained, but VO2max drifts down. So it needs a standing weekly dose, not a one-off build. The good news: maintenance is cheap and intensity-driven. One genuinely hard high-intensity session a week develops and then defends a healthy VO2max, because maintaining an adaptation needs far less work than building it — as long as the intensity stays high. The weekly session does double duty: develop now, defend against age-related decline later.`,
        ],
      },
      {
        title: "Why Two Cardio Sessions — the polarized pair",
        headline:
          "One hard session (Wednesday intervals) and one easy session (Saturday parkrun). Hard stays hard and rare; easy stays easy and social. They do different jobs.",
        body: [
          `This is polarized cardio — the distribution endurance research favours: most easy, a small dose genuinely hard. Wednesday is the hard dose — VO2max intervals (10-min warm-up, 3×[3 min hard / 3 min easy], 5-min cooldown), the one high-intensity stimulus that develops and defends VO2max. Run it hard but controlled: "couple of words, not a sentence," just holdable for the three minutes, glad for the bell. Saturday parkrun is the easy dose — 5k at conversational pace, deliberately NOT raced. It adds aerobic base, but its real value is also social connection and enjoyment, the things that make it a sustainable institution.`,
          `Keeping them distinct is the point: if you race parkrun, you've created a second hard session that clashes with Wednesday's intervals and your lifting recovery. One hard, one easy — they complement rather than compete. The hard session is irreplaceable (it's the VO2max defender); the easy session is the aerobic-and-social half.`,
        ],
      },
      {
        title: "Hold Intensity Steady for ~6 Months",
        headline:
          "Don't chase faster paces early. Let pace-knowledge, watch calibration, and connective tissue all catch up before pushing intensity.",
        body: [
          `"Hard" is relative to your max, so as fitness improves the same effort produces faster paces automatically — you don't need to force it. For the first ~6 months, run the intervals at a consistent hard-but-controlled effort while three things catch up: your knowledge of your own paces, your watch's calibration to you, and — most importantly — your connective tissue. Tendons and ligaments adapt much slower than your heart, lungs, and muscles, so chasing speed early is how new runners get injured: the fitness writes a cheque the tendons can't yet cash.`,
          `The asymmetry favors patience: pushing pace early has little upside (the 30-year institution doesn't care if you got faster in month two vs month eight) and real downside (an injury that breaks the habit). Let the pace drift up naturally to keep the effort honest, but save deliberate intensity-pushing for after the tissues have had their months to adapt. Thirty years to optimize — there's no rush.`,
        ],
      },
    ],
  },
  {
    id: "framework",
    title: "Framework",
    entries: [
      {
        title: "The Three Result Metrics — and that they behave differently",
        headline:
          "Body fat %, FFMI, and VO2max are three separate dials with three different timescales. Don't manage them as one thing.",
        body: [
          `Body fat % moves fast and is driven by the diet/calorie lever — weeks to months, fully in your control via the deficit. FFMI (muscle) is the slow one — years to build, capped by genetics, driven by training and surplus, and it persists well even when untrained. VO2max is the leaky one — it improves fast, plateaus fast, and uniquely decays without ongoing input, so it needs a standing weekly dose rather than a one-off build. Managing them as "fitness" in the aggregate is a mistake because they respond to different levers on different clocks: you cut for body fat, you patiently accumulate for FFMI, and you maintain VO2max with one weekly session. Knowing which dial you're turning, and on what timescale to expect results, stops you from misreading slow FFMI progress as failure or expecting VO2max to stay put on its own.`,
        ],
      },
      {
        title: "The Spaceship, Not the Bronco — run on understanding, not willpower",
        headline:
          "A rigid plan you white-knuckle breaks the moment life bucks. A system built on understanding flexes and survives.",
        body: [
          `The bronco is the willpower model: a strict plan held by force, which throws you off the moment life disrupts it, and then the culture blames you for lacking discipline. The spaceship is the understanding model: you learn how the system actually works, set it up to run with your biology and your life rather than against them, and it sustains because it isn't spending willpower it doesn't have. Comfortable high-volume-eating cuts instead of grinding restriction; a training week dosed to recovery instead of maximalist everything; institutions with humane windows instead of rigid appointments. The whole framework is designed so that adherence comes from the structure and the understanding, not from daily heroics. When something feels like it requires willpower, that's the signal the model is wrong, not that you're weak — find the dial you're missing.`,
        ],
      },
      {
        title: "The Proxy Problem — drop a level below what everyone argues about",
        headline:
          "Most fitness debates fight over a visible proxy (daily grams, total sets, body weight) while ignoring the mechanism underneath. The skill is dropping one level down.",
        body: [
          `Across nearly every fitness argument, people fixate on a measurable surface proxy and never reach the mechanism it's standing in for. Protein discourse fights over daily grams instead of leucine gates and pulse timing. Volume discourse fights over set counts instead of hard-set quality and recovery. Diet fights over the calorie number instead of satiety, TEF, and the food matrix. The proxy is where the noise concentrates because it's simple and arguable; the mechanism is where the truth lives because it's what the proxy crudely tracks. Once you drop to the mechanism, the proxy fight dissolves — you can see what it was approximating all along, and where it breaks. This is the single most transferable skill in the whole framework: when everyone's arguing about a number, ask what real process that number is a lossy stand-in for, and reason about that.`,
        ],
      },
    ],
  },
];
