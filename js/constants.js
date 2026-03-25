// Bloom constants — all static data, quotes, habit definitions, levels, celebrations
export const VERSION = '2.8.0';

export const WHATS_NEW = [
  { text: 'Skill-building tools — 5-4-3-2-1 grounding, guided body scan, and gentle cognitive reframing are now in your Wellness tab.', spotlight: null, tab: 'wellness', featured: true },
  { text: 'Pride theme — a warm, inclusive palette with a rainbow accent. Find it in Settings > Appearance.', spotlight: null, featured: true },
  { text: 'Send love — tap the bloom button to send a wordless 🌸 to your buddy. Sometimes no words are the right words.', spotlight: null, tab: 'community' },
  { text: 'CSV export — download your mood and habit history as a spreadsheet from Settings > Data & privacy.', spotlight: null },
  { text: 'Better accessibility — keyboard navigation, skip-to-content link, and focus trapping in all overlays.', spotlight: null },
];

// ============================================================
//  DAILY QUOTES
// ============================================================
export const DAILY_QUOTES = [
  "Every small step forward is still forward.",
  "You showed up. That's the whole thing.",
  "Rest is not the opposite of progress.",
  "You are allowed to be a work in progress.",
  "Gentle is also a form of strong.",
  "Some days, existing is enough.",
  "Growth happens quietly.",
  "You don't have to earn rest.",
  "Being here counts.",
  "Kindness to yourself is not a luxury.",
  "Whatever you're feeling right now is okay.",
  "Small moments build big lives.",
  "Today is a new page.",
  "Caring for yourself is not selfish.",
  "You've survived every hard day so far.",
  "Imperfect progress is still progress.",
  "You belong in your own story.",
  "Nothing about today has to be perfect.",
  "Roots before branches.",
  "The smallest seed becomes something.",
  "You matter more than your productivity.",
  "Breathe. You've got this.",
  "Even forests need rain.",
  "Be patient with yourself — growth takes time.",
  "Your feelings are valid.",
  "One breath at a time.",
  "Consistency is not perfection.",
  "You are enough, right now.",
  "Today is its own thing.",
  "There is grace in the trying.",
];

export const JOURNAL_PROMPTS = [
  "What's one small thing that felt okay today?",
  "How are you really doing right now?",
  "What's been weighing on your mind lately?",
  "What did your body need today?",
  "What are you grateful for, even a tiny bit?",
  "What would feel like a win for tomorrow?",
  "How did you take care of yourself today?",
  "What's one thing you want to let go of?",
  "What made you smile, even briefly?",
  "What do you wish someone knew about how you're feeling?",
  "What's been hard, and how have you handled it?",
  "What do you need more of right now?",
  "Describe your energy today in a few words.",
  "What did you notice about yourself today?",
  "If today had a weather forecast, what would it be?",
  "What's one thing you did for yourself today?",
  "What are you looking forward to, even a little?",
  "What do you want to remember about today?",
  "How has your mood shifted throughout today?",
  "What feels unfinished, and is that okay?",
  "What did you learn about yourself this week?",
  "What boundaries did you hold (or wish you had)?",
  "What does rest look like for you right now?",
  "What made today different from yesterday?",
  "What would you say to yourself at the start of today?",
  "What are you carrying that isn't yours to carry?",
  "What felt true today?",
  "What kind of support do you need right now?",
  "What are you proud of, even quietly?",
  "What does growth feel like for you lately?",
];

// Gentle prompts — shown when mood is low (0-1)
export const JOURNAL_PROMPTS_LOW = [
  "You don't have to explain yourself. What's here right now?",
  "What does your body feel like today?",
  "If you could ask for one thing right now, what would it be?",
  "What's one tiny thing that might help, even a little?",
  "What would you say to a friend feeling the way you do?",
  "Is there anything you need to put down today?",
  "What does rest look like for you right now?",
  "You showed up. That matters. What's on your mind?",
  "What's the smallest kind thing you could do for yourself right now?",
  "You don't have to fix anything. What do you just need to say?",
  "What would feel like enough for today?",
  "Is there something you keep thinking about? You can put it here.",
  "What does comfort look like for you today?",
  "If today were almost over, what would you want to have done for yourself?",
  "What's one thing that felt hard that you haven't said out loud?",
  "You're allowed to not be okay. What's true right now?",
  "What's something gentle you can tell yourself today?",
  "What would it look like to go easy on yourself right now?",
];


// getJournalPrompt() moved to state.js (depends on state + getDayIndex)

export const REFLECTION_QUESTIONS = [
  "What went well this week, even in small ways?",
  "What felt hard, and how did you move through it?",
  "What do you want to carry into next week?",
];

export const HABIT_AFFIRMATIONS = {
  m_teeth: ["Clean teeth, clear mind.", "The day starts with you.", "A gentle start."],
  e_teeth: ["A soft ending to the day.", "You took care of yourself.", "Rest well."],
  brush_teeth: ["Clean teeth, clear mind.", "The day starts with you.", "A gentle start."],
  brush_hair: ["Looking after yourself.", "A small act of care.", "You showed up for you."],
  wash_face: ["Fresh face, fresh start.", "A kind thing for yourself.", "One gentle act at a time."],
  get_dressed: ["Dressed and showing up.", "Some days that's everything.", "You got ready."],
  floss: ["Extra care.", "The details matter too.", "You went the extra step."],
  skincare: ["Skincare done.", "You're investing in yourself.", "Kind acts for your body."],
  medication: ["Medication taken — that's real strength.", "One of the most important things you can do for yourself.", "You showed up for your well-being. That matters."],
  w_shower: ["That took real courage.", "A clean start changes everything.", "You showed up for yourself."],
  w_exercise: ["Your body says thank you.", "You showed up and moved.", "That took effort — and you did it."],
  w_outside: ["Fresh air is self-care.", "The world needed your presence today.", "Outside counts."],
  mood: ["Noted — thanks for checking in.", "Awareness is the first step."],
  water: ["Hydration is self-care.", "Your body thanks you.", "One sip at a time."],
  food: ["Nourishment matters.", "You fed yourself. That counts.", "Taking care from the inside."],
  journal: ["Words matter. Yours do.", "You made space for yourself.", "That was brave."],
  win: ["That counts.", "Look at that.", "A win is a win."],
};

export const LEVELS = [
  { name: 'Seedling',  min: 0,    emoji: '🌱' },
  { name: 'Sprout',    min: 150,  emoji: '🌿' },
  { name: 'Blooming',  min: 400,  emoji: '🌸' },
  { name: 'Thriving',  min: 900,  emoji: '🌻' },
  { name: 'Radiant',   min: 1800, emoji: '✨' },
  { name: 'Glowing',   min: 3200, emoji: '🌟' },
];

export const DAILY_HABITS = [
  { id: 'brush_teeth',  icon: '🦷', label: 'Brush teeth',       xp: 15, defaultTime: 'any' },
  { id: 'brush_hair',   icon: '💇', label: 'Brush hair',        xp: 15, defaultTime: 'any' },
  { id: 'wash_face',    icon: '🧴', label: 'Wash face',         xp: 15, defaultTime: 'any' },
  { id: 'get_dressed',  icon: '👕', label: 'Get dressed',       xp: 15, defaultTime: 'any' },
  { id: 'floss',        icon: '🦷', label: 'Floss',             xp: 15, defaultTime: 'any' },
  { id: 'skincare',     icon: '✨', label: 'Skincare routine',  xp: 15, defaultTime: 'any' },
];

export const MEDICATION_HABIT = { id: 'medication', icon: '💊', label: 'Medication', xp: 20, defaultTime: 'any' };

// ============================================================
//  SELF-CARE TASKS
// ============================================================
export const SELF_CARE_CATEGORIES = [
  {
    id: 'morning_moments',
    icon: '☀️',
    label: 'Morning moments',
    sub: 'Gentle ways to start the day',
    tasks: [
      { id: 'sc_natural_light', icon: '☀️', label: 'Got some natural light' },
      { id: 'sc_make_bed',      icon: '🛏', label: 'Made my bed' },
      { id: 'sc_warm_drink',    icon: '☕', label: 'Had something warm to drink' },
      { id: 'sc_open_window',   icon: '🪟', label: 'Opened a window' },
    ],
  },
  {
    id: 'movement',
    icon: '🧘',
    label: 'Movement & body',
    sub: 'Any amount counts',
    tasks: [
      { id: 'sc_stretch',       icon: '🧘', label: 'Stretched or moved gently' },
      { id: 'sc_short_walk',    icon: '🚶', label: 'Walked, even just a little' },
      { id: 'sc_dance',         icon: '💃', label: 'Moved my body in any way' },
      { id: 'sc_deep_breath',   icon: '😮‍💨', label: 'Took a few deep breaths' },
    ],
  },
  {
    id: 'connection',
    icon: '💚',
    label: 'Connection',
    sub: 'With others, or the world around you',
    tasks: [
      { id: 'sc_reached_out',  icon: '📱', label: 'Reached out to someone' },
      { id: 'sc_pet_care',     icon: '🐾', label: 'Cared for my pet' },
      { id: 'sc_plant_care',   icon: '🪴', label: 'Watered a plant' },
      { id: 'sc_read',         icon: '📖', label: 'Read something, even a page' },
      { id: 'sc_music',        icon: '🎵', label: 'Listened to music I love' },
    ],
  },
  {
    id: 'wind_down',
    icon: '🌙',
    label: 'Wind down',
    sub: 'Easing into rest',
    tasks: [
      { id: 'sc_reasonable_bedtime', icon: '🌙', label: 'Went to bed at a good time' },
      { id: 'sc_screen_free',        icon: '📵', label: 'Had some screen-free time' },
      { id: 'sc_moment_for_me',      icon: '🙏', label: 'Took a moment just for me' },
      { id: 'sc_tidy',               icon: '🧹', label: 'Tidied one small thing' },
    ],
  },
];

export const SELF_CARE_TASKS = SELF_CARE_CATEGORIES.flatMap(c => c.tasks);

export const CELEBRATIONS = {
  m_teeth: {
    emoji: '🦷', xp: 15,
    messages: [
      { title: 'Morning routine — done.', sub: 'The day starts with you.' },
      { title: 'Clean teeth, clear mind.', sub: 'Something small, something real.' },
      { title: 'You started the day.', sub: 'That counts more than you know.' },
      { title: 'Fresh start.', sub: 'Two minutes of pure self-care.' },
      { title: 'Morning: handled.', sub: 'One thing done, everything easier.' },
      { title: 'Look at you go.', sub: 'Starting strong today.' },
      { title: 'First step taken.', sub: 'The rest follows from here.' },
      { title: 'Your morning self says thanks.', sub: 'Consistency is quiet power.' },
    ],
  },
  e_teeth: {
    emoji: '🌙', xp: 15,
    messages: [
      { title: 'Evening done.', sub: 'Rest easy tonight.' },
      { title: 'You took care of yourself.', sub: 'Small act, real love.' },
      { title: 'Day complete.', sub: 'Well done.' },
      { title: 'The day is closing gently.', sub: 'You ended it right.' },
      { title: 'Night routine locked in.', sub: 'Sleep peacefully.' },
      { title: 'One more day of showing up.', sub: 'That\'s your superpower.' },
      { title: 'Before you rest.', sub: 'You cared for yourself. Again.' },
      { title: 'Goodnight ritual — done.', sub: 'Tomorrow you\'ll be glad you did this.' },
    ],
  },
  w_shower: {
    emoji: '🚿', xp: 20,
    messages: [
      { title: 'Fresh start.', sub: 'A clean slate changes everything.' },
      { title: 'That took real courage.', sub: 'Some days this is the hardest thing.' },
      { title: 'Clean and grounded.', sub: 'You showed up for yourself.' },
      { title: 'Reset complete.', sub: 'Sometimes the simplest things matter most.' },
      { title: 'You did a hard thing.', sub: 'Respect.' },
      { title: 'Fresh and present.', sub: 'You chose yourself today.' },
      { title: 'One of those quiet victories.', sub: 'Not everyone understands how big this is.' },
      { title: 'Renewed.', sub: 'Body and spirit, a little lighter.' },
    ],
  },
  w_exercise: {
    emoji: '💪', xp: 20,
    messages: [
      { title: 'Movement done!', sub: 'Every rep is a vote for yourself.' },
      { title: 'Your body says thank you.', sub: 'You chose to move, and that matters.' },
      { title: 'You showed up for your body.', sub: 'This is what growth looks like.' },
      { title: 'Endorphins unlocked.', sub: 'You earned every single one.' },
      { title: 'That was all you.', sub: 'Your body is grateful.' },
      { title: 'You moved your body.', sub: 'That\'s a genuine act of self-care.' },
      { title: 'You chose the hard thing.', sub: 'That\'s character.' },
      { title: 'Energy: invested.', sub: 'Watch it come back to you tenfold.' },
    ],
  },
  w_outside: {
    emoji: '🌿', xp: 20,
    messages: [
      { title: 'Fresh air — got it.', sub: 'Even a few minutes matters.' },
      { title: 'Outside, done.', sub: 'The world needed you in it today.' },
      { title: 'You stepped out.', sub: 'Nature noticed.' },
      { title: 'Sunshine on your skin.', sub: 'The simplest reset there is.' },
      { title: 'The outside world welcomed you.', sub: 'You belong out there.' },
      { title: 'Sky seen. Air breathed.', sub: 'Sometimes that\'s the whole thing.' },
      { title: 'You left the house.', sub: 'On some days, that\'s heroic.' },
      { title: 'Green therapy.', sub: 'Your nervous system thanks you.' },
    ],
  },
  household: {
    emoji: '🏠', xp: 15,
    messages: [
      { title: 'Task done!', sub: 'One less weight on your mind.' },
      { title: 'Your space thanks you.', sub: 'Small acts of care add up.' },
      { title: 'Done and dusted.', sub: 'A tidy space, a clearer mind.' },
    ],
  },
  mood: {
    emoji: '💚', xp: 0,
    messages: [
      { title: 'Mood logged.', sub: 'Awareness is the first step.' },
      { title: 'Thanks for checking in.', sub: 'Knowing how you feel matters.' },
      { title: 'Noted with care.', sub: 'You\'re paying attention to yourself.' },
    ],
  },
  sleep: {
    emoji: '😴', xp: 0,
    messages: [
      { title: 'Sleep logged.', sub: 'Rest is part of the work too.' },
      { title: 'Thanks for tracking.', sub: 'Sleep shapes everything.' },
    ],
  },
  water: {
    emoji: '💧', xp: 15,
    messages: [
      { title: 'Water goal reached! 💧', sub: 'Your body is saying thank you right now.' },
      { title: 'Three bottles — done!', sub: 'Hydration is self-care. You nailed it.' },
      { title: 'Fully hydrated today.', sub: 'One of the kindest things you can do.' },
    ],
    confetti: true,
  },
  food: {
    emoji: '🍽', xp: 0,
    messages: [
      { title: 'Nourishment — checked ✓', sub: 'Feeding yourself is an act of love.' },
      { title: 'You fed yourself today.', sub: 'That matters more than you know.' },
      { title: 'Body fuelled.', sub: 'Nourishment is the foundation of everything.' },
    ],
  },
  journal: {
    emoji: '📓', xp: 20,
    messages: [
      { title: 'Journal saved.', sub: 'bloom is reading what you wrote...' },
      { title: 'Words on the page.', sub: 'That took something. Good.' },
      { title: 'You made space for yourself.', sub: 'A response is on its way.' },
    ],
  },
  reflection: {
    emoji: '🪞', xp: 20,
    messages: [
      { title: 'Reflection saved.', sub: 'bloom is thinking about what you shared...' },
      { title: 'You looked inward.', sub: 'That\'s the hardest kind of courage.' },
      { title: 'Reflection complete.', sub: 'A response is on its way.' },
    ],
  },
  win: {
    emoji: '⭐', xp: 5,
    messages: [
      { title: 'Win logged!', sub: 'That counts. Every single one.' },
      { title: 'Look at that.', sub: 'You\'re doing better than you think.' },
      { title: 'A win is a win.', sub: 'No matter how small.' },
    ],
  },
  breath: {
    emoji: '🌬', xp: 0,
    messages: [
      { title: 'Breathing session done.', sub: 'Your nervous system thanks you.' },
      { title: 'Four cycles complete.', sub: 'That\'s genuine self-care.' },
      { title: 'Well done.', sub: 'Take a moment to notice how you feel.' },
    ],
  },
  affirmation: {
    emoji: '💗', xp: 5, hearts: true,
    messages: [
      { title: 'Affirmation saved.', sub: 'It\'ll find you when you need it.' },
      { title: 'Kind words, kept safe.', sub: 'bloom will bring this back to you.' },
    ],
  },
  all_done: {
    emoji: '🎉', xp: 0,
    confetti: true,
    messages: [
      { title: 'All done for today!', sub: 'Every single thing. You showed up fully.' },
      { title: 'Perfect day logged 🌟', sub: 'Go be easy on yourself now — you\'ve earned it.' },
      { title: 'Today was yours.', sub: 'Every habit, every check. Well done.' },
    ],
  },
  weekly_goal: {
    emoji: '🎯', xp: 0,
    confetti: true,
    messages: [
      { title: 'Weekly goal hit!', sub: 'You set a goal and you kept it.' },
      { title: 'Goal reached! 🎯', sub: 'That\'s consistency. That\'s you.' },
    ],
  },
  insight: {
    emoji: '💫', xp: 0,
    messages: [
      { title: 'Insight generated.', sub: 'bloom looked at your week and found something.' },
      { title: 'Your week, reflected back.', sub: 'Scroll up to read it.' },
    ],
  },
  // Daily habit celebrations (body care + medication)
  brush_teeth: {
    emoji: '🦷', xp: 15,
    messages: [
      { title: 'Clean teeth, clear mind.', sub: 'Something small, something real.' },
      { title: 'You showed up for you.', sub: 'That counts more than you know.' },
      { title: 'Done.', sub: 'The little things add up.' },
      { title: 'Sparkle.', sub: 'Two minutes, real results.' },
      { title: 'A tiny act of love.', sub: 'For future you.' },
      { title: 'Checked off.', sub: 'One more brick in the wall of consistency.' },
      { title: 'Your teeth approve.', sub: 'And so does your future self.' },
      { title: 'Building the habit.', sub: 'Every day it gets a little more automatic.' },
    ],
  },
  brush_hair: {
    emoji: '💇', xp: 15,
    messages: [
      { title: 'Looking after yourself.', sub: 'That\'s not small. That matters.' },
      { title: 'A small act of care.', sub: 'You showed up for you.' },
      { title: 'Tangle-free.', sub: 'Inside and out, a little smoother.' },
      { title: 'You took the time.', sub: 'For yourself. That\'s everything.' },
      { title: 'Groomed and grounded.', sub: 'The little rituals matter.' },
      { title: 'Self-care in motion.', sub: 'Keep going.' },
    ],
  },
  wash_face: {
    emoji: '🧴', xp: 15,
    messages: [
      { title: 'Fresh face, fresh start.', sub: 'A kind thing for yourself.' },
      { title: 'You took care of yourself.', sub: 'One gentle act at a time.' },
      { title: 'Clean slate.', sub: 'Your skin thanks you.' },
      { title: 'A moment of care.', sub: 'These moments build lives.' },
      { title: 'Refreshed.', sub: 'Ready for whatever comes next.' },
      { title: 'Gentle routine.', sub: 'The foundation of a good day.' },
    ],
  },
  get_dressed: {
    emoji: '👕', xp: 15,
    messages: [
      { title: 'Dressed and showing up.', sub: 'Some days that\'s everything.' },
      { title: 'You got ready.', sub: 'That took something. Good.' },
      { title: 'Ready for the world.', sub: 'Or just ready. That\'s enough.' },
      { title: 'You put yourself together.', sub: 'Literally and figuratively.' },
      { title: 'Outfit: on.', sub: 'Confidence: building.' },
      { title: 'This step is bigger than it looks.', sub: 'You know that. We know that.' },
    ],
  },
  floss: {
    emoji: '🦷', xp: 15,
    messages: [
      { title: 'Extra care.', sub: 'The details matter too.' },
      { title: 'You went the extra step.', sub: 'That\'s real self-care.' },
      { title: 'Above and beyond.', sub: 'Your dentist would be proud.' },
      { title: 'The full routine.', sub: 'Thoroughness is a form of love.' },
      { title: 'Commitment level: serious.', sub: 'You don\'t cut corners on yourself.' },
      { title: 'Deep clean.', sub: 'The little things you do for future you.' },
    ],
  },
  skincare: {
    emoji: '✨', xp: 15,
    messages: [
      { title: 'Skincare — done.', sub: 'You\'re investing in yourself.' },
      { title: 'A little glow-up.', sub: 'Kind acts for your body.' },
      { title: 'Glowing from the inside out.', sub: 'Self-care looks good on you.' },
      { title: 'Your skin is grateful.', sub: 'These routines add up.' },
      { title: 'Ritual complete.', sub: 'You honored yourself today.' },
      { title: 'Layer by layer.', sub: 'Building better days.' },
    ],
  },
  medication: {
    emoji: '💊', xp: 20,
    messages: [
      { title: 'Medication taken.', sub: 'Taking care of yourself in every way.' },
      { title: 'Done.', sub: 'One quiet act of self-care.' },
      { title: 'You remembered.', sub: 'That counts.' },
      { title: 'On track.', sub: 'Consistency is its own reward.' },
      { title: 'An important step.', sub: 'You\'re looking after yourself properly.' },
      { title: 'Taken care of.', sub: 'Your body and mind thank you.' },
      { title: 'Daily commitment — kept.', sub: 'That\'s strength.' },
      { title: 'Health first.', sub: 'You made the right choice.' },
    ],
  },
  // Self-care task celebrations
  sc_body: {
    emoji: '💛', xp: 10,
    messages: [
      { title: 'You took care of yourself.', sub: 'That\'s not small. That matters.' },
      { title: 'Body care — done.', sub: 'One kind act for yourself today.' },
      { title: 'You showed up for you.', sub: 'This is what self-care looks like.' },
    ],
  },
  sc_morning: {
    emoji: '☀️', xp: 10,
    messages: [
      { title: 'Morning moment — checked.', sub: 'You started the day with yourself.' },
      { title: 'The day began gently.', sub: 'That\'s worth something.' },
      { title: 'A good start.', sub: 'However the rest goes, you began well.' },
    ],
  },
  sc_movement: {
    emoji: '🧘', xp: 10,
    messages: [
      { title: 'You moved.', sub: 'Any movement is the right movement.' },
      { title: 'Body in motion.', sub: 'Even a little counts. Especially a little.' },
      { title: 'You listened to your body.', sub: 'That\'s exactly right.' },
    ],
  },
  sc_connection: {
    emoji: '💚', xp: 10,
    messages: [
      { title: 'Connection — made.', sub: 'You reached beyond yourself today.' },
      { title: 'You weren\'t alone today.', sub: 'That matters more than you know.' },
      { title: 'A moment of connection.', sub: 'Small bridges hold the most weight.' },
    ],
  },
  sc_wind_down: {
    emoji: '🌙', xp: 10,
    messages: [
      { title: 'Winding down.', sub: 'Rest is part of the work.' },
      { title: 'You\'re taking care of tomorrow too.', sub: 'Rest well.' },
      { title: 'The day is done.', sub: 'You can let it go now.' },
    ],
  },
  sc_medication: {
    emoji: '💊', xp: 10,
    messages: [
      { title: 'Medication taken.', sub: 'Taking care of yourself in every way.' },
      { title: 'Done.', sub: 'One quiet act of self-care.' },
      { title: 'You remembered.', sub: 'That counts.' },
    ],
  },
};


export const XP_VALUES = {
  m_teeth: 15, e_teeth: 15, w_shower: 20, w_exercise: 20,
  w_outside: 20, water_goal: 15, food: 15, journal: 20,
  household: 15, reflection: 20,
  // Daily habits — all self-care is equally valued
  brush_teeth_am: 15, brush_teeth_pm: 15, brush_teeth_any: 15,
  brush_hair_am: 15, brush_hair_pm: 15, brush_hair_any: 15,
  wash_face_am: 15, wash_face_pm: 15, wash_face_any: 15,
  get_dressed_am: 15, get_dressed_pm: 15, get_dressed_any: 15,
  floss_am: 15, floss_pm: 15, floss_any: 15,
  skincare_am: 15, skincare_pm: 15, skincare_any: 15,
  // Medication adherence — one of the most impactful mental health actions
  medication_am: 20, medication_pm: 20, medication_any: 20,
