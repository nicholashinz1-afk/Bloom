// Bloom sheets — bottom sheet management, science tooltips, crisis sheet
import { state } from './state.js';
import { save } from './storage.js';
import { trapFocusInSheet, releaseFocusTrap } from './router.js';
import { sendTelemetry, trackFeature } from './telemetry.js';

function openSheet(id) {
  document.getElementById('sheet-backdrop').classList.add('open');
  const sheet = document.getElementById(id);
  sheet.classList.add('open');
  // Move focus into the sheet for keyboard/screen reader users
  sheet.setAttribute('tabindex', '-1');
  setTimeout(() => {
    const firstFocusable = sheet.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) firstFocusable.focus();
    else sheet.focus();
    trapFocusInSheet(sheet);
  }, 100);
}

function closeAllSheets() {
  document.querySelectorAll('.bottom-sheet.open').forEach(s => releaseFocusTrap(s));
  document.getElementById('sheet-backdrop').classList.remove('open');
  document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('open'));
}

function openCrisisSheet() { openSheet('crisis-sheet'); trackFeature('crisis'); }

// ============================================================
//  SCIENCE / INFO TOOLTIPS
// ============================================================
const SCIENCE_SECTIONS = {
  mood: {
    title: 'Mood awareness',
    tip: 'Naming how you feel helps regulate it. Psychologists call this "affect labeling" — it reduces amygdala activity.',
    full: `<p>Research by Matthew Lieberman at UCLA found that simply putting a name to an emotion — what scientists call <strong>affect labeling</strong> — reduces activity in the amygdala, the brain's threat-detection center. This means the act of checking in with your mood isn't just tracking — it's actively calming your nervous system.</p>
    <p>A 2019 study in <em>Psychological Science</em> also showed that people with higher <strong>emotional granularity</strong> (the ability to distinguish between similar emotions) are better at regulating their responses to stress. The more you practice noticing how you feel, the better you get at it.</p>`,
    sources: [
      'Lieberman, M. D., et al. (2007). Putting feelings into words: Affect labeling disrupts amygdala activity. <em>Psychological Science</em>, 18(5), 421–428.',
      'Tugade, M. M., et al. (2004). Psychological resilience and positive emotional granularity. <em>Journal of Personality</em>, 72(6), 1161–1190.',
    ],
  },
  sleep: {
    title: 'Sleep tracking',
    tip: 'Simply being aware of your sleep patterns helps you make better choices around rest.',
    full: `<p><strong>Sleep self-monitoring</strong> has been shown to improve sleep behavior even without formal intervention. A study in the <em>Journal of Clinical Sleep Medicine</em> found that participants who tracked their sleep made measurable improvements in sleep hygiene within weeks.</p>
    <p>bloom doesn't judge your sleep or set goals — it just helps you notice patterns. Over time, you may start to see connections between how you slept and how your day went, which naturally guides better choices.</p>`,
    sources: [
      'Koffel, E., et al. (2015). A randomized controlled pilot study of CBT-I Coach. <em>Journal of Clinical Sleep Medicine</em>, 11(12), 1443–1449.',
      'Irish, L. A., et al. (2015). The role of sleep hygiene in promoting public health. <em>Sleep Medicine Reviews</em>, 22, 23–36.',
    ],
  },
  hydration: {
    title: 'Hydration',
    tip: 'Even mild dehydration can lower mood and increase fatigue. Three bottles is a simple, achievable daily baseline.',
    full: `<p>A study at the University of Connecticut found that even <strong>mild dehydration</strong> (1–2% body water loss) significantly impaired mood, concentration, and increased perception of task difficulty — particularly in women. You don't need to be thirsty to be affected.</p>
    <p>bloom uses three bottles as a <strong>minimum viable goal</strong> rather than an aggressive target. The aim isn't perfection — it's building awareness of a basic need that's easy to forget, especially on hard days.</p>`,
    sources: [
      'Armstrong, L. E., et al. (2012). Mild dehydration affects mood in healthy young women. <em>The Journal of Nutrition</em>, 142(2), 382–388.',
      'Ganio, M. S., et al. (2011). Mild dehydration impairs cognitive performance and mood of men. <em>British Journal of Nutrition</em>, 106(10), 1535–1543.',
    ],
  },
  nourishment: {
    title: 'Nourishment',
    tip: 'Tracking meals isn\'t about diet — it\'s recognizing that feeding yourself is a fundamental act of self-care.',
    full: `<p>bloom's nourishment tracking is intentionally <strong>anti-diet-culture</strong>. There are no calories, no "good" or "bad" foods — just a gentle acknowledgment that you ate. For people dealing with depression, anxiety, or executive dysfunction, <strong>remembering to eat</strong> can be genuinely difficult.</p>
    <p>Research shows that regular meals stabilize blood sugar, which directly impacts mood, cognitive function, and emotional regulation. The simple act of noticing "I fed myself today" reinforces self-care as a practice.</p>`,
    sources: [
      'Adan, A. (2012). Cognitive performance and dehydration. <em>Journal of the American College of Nutrition</em>, 31(2), 71–78.',
      'Gómez-Pinilla, F. (2008). Brain foods: The effects of nutrients on brain function. <em>Nature Reviews Neuroscience</em>, 9(7), 568–578.',
    ],
  },
  streaks: {
    title: 'Showing up & consistency',
    tip: 'What matters is how many days you show up — not whether they\'re in a row. Missing a day changes nothing.',
    full: `<p>Research on habit formation shows that missing a single day has <strong>no measurable impact</strong> on long-term habit strength. Phillippa Lally's research at University College London found that habits take an average of 66 days to become automatic, and occasional misses during that period didn't derail the process.</p>
    <p>That's why bloom tracks <strong>total days you've shown up</strong> instead of consecutive streaks. Your total never goes down — missing a day is just missing a day, not losing progress. This removes the anxiety of "breaking a streak" while preserving the motivation of watching your number grow.</p>`,
    sources: [
      'Lally, P., et al. (2010). How are habits formed: Modelling habit formation in the real world. <em>European Journal of Social Psychology</em>, 40(6), 998–1009.',
      'Gardner, B., et al. (2012). Making health habitual. <em>British Journal of General Practice</em>, 62(605), 664–666.',
    ],
  },
  journal: {
    title: 'Journaling',
    tip: 'Writing about your thoughts and feelings reduces anxiety and improves emotional processing.',
    full: `<p>James Pennebaker's landmark research demonstrated that <strong>expressive writing</strong> — writing about thoughts and feelings for even 15–20 minutes — reduces anxiety, improves immune function, and helps process difficult experiences. Participants didn't need to write "well" — just honestly.</p>
    <p>A meta-analysis of 146 studies confirmed that expressive writing produces significant benefits for psychological health, particularly for processing stressful or emotional events. bloom's journal prompts are designed to lower the barrier — you don't need to know what to write, just respond to what's asked.</p>`,
    sources: [
      'Pennebaker, J. W. (1997). Writing about emotional experiences as a therapeutic process. <em>Psychological Science</em>, 8(3), 162–166.',
      'Frattaroli, J. (2006). Experimental disclosure and its moderators: A meta-analysis. <em>Psychological Bulletin</em>, 132(6), 823–865.',
    ],
  },
  wins: {
    title: 'Small wins',
    tip: 'Noticing small wins rewires your brain\'s negativity bias and builds a sense of progress.',
    full: `<p>Teresa Amabile's research at Harvard Business School identified <strong>the progress principle</strong>: of all the things that can boost motivation and positive emotion during a day, the single most important is making progress in meaningful work — even small progress.</p>
    <p>Our brains have a <strong>negativity bias</strong>, meaning we naturally pay more attention to what went wrong than what went right. Deliberately logging small wins counteracts this by training your attention toward positive evidence. Over time, this shifts your default perception from "nothing is working" to "I'm doing more than I thought."</p>`,
    sources: [
      'Amabile, T. M. & Kramer, S. J. (2011). The progress principle. <em>Harvard Business Review Press</em>.',
      'Baumeister, R. F., et al. (2001). Bad is stronger than good. <em>Review of General Psychology</em>, 5(4), 323–370.',
    ],
  },
  affirmations: {
    title: 'Affirmations',
    tip: 'Affirmations work best when they feel true. They help reinforce your values and sense of self.',
    full: `<p><strong>Self-affirmation theory</strong> (Claude Steele, 1988) shows that reflecting on personal values reduces defensiveness and stress. The key finding: affirmations are most effective when they resonate with who you already are — not who you wish you were.</p>
    <p>That's why bloom lets you write your own affirmations rather than providing generic ones. A statement that feels true to you ("I am trying my best") is far more powerful than an aspirational one that triggers resistance ("I am unstoppable"). bloom surfaces your saved affirmations randomly as you use the app, creating small moments of self-reinforcement throughout your day.</p>`,
    sources: [
      'Steele, C. M. (1988). The psychology of self-affirmation. <em>Advances in Experimental Social Psychology</em>, 21, 261–302.',
      'Cohen, G. L. & Sherman, D. K. (2014). The psychology of change: Self-affirmation and social psychological intervention. <em>Annual Review of Psychology</em>, 65, 333–371.',
    ],
  },
  reflection: {
    title: 'Weekly reflection',
    tip: 'Looking back helps you learn from your own experience. Reflection turns lived days into lasting insight.',
    full: `<p><strong>Metacognition</strong> — thinking about your own thinking — is one of the strongest predictors of personal growth and learning. Research by Giada Di Stefano at Harvard Business School showed that employees who spent 15 minutes at the end of the day reflecting on lessons learned performed <strong>23% better</strong> than those who didn't.</p>
    <p>bloom's weekly reflection is deliberately scheduled on weekends, when you have mental space to look back without the pressure of a weekday. The three questions are designed to balance acknowledgment (what went well), honesty (what was hard), and intention (what to carry forward).</p>`,
    sources: [
      'Di Stefano, G., et al. (2016). Learning by thinking: How reflection aids performance. <em>Harvard Business School Working Paper</em>, 14-093.',
      'Grant, A. M., et al. (2002). The impact of life coaching on goal attainment, metacognition, and mental health. <em>Social Behavior and Personality</em>, 31(3), 253–263.',
    ],
  },
  breathing: {
    title: 'Breathing exercises',
    tip: 'The 4-7-8 technique activates your vagus nerve, shifting your body from stress mode to rest mode.',
    full: `<p>The <strong>4-7-8 breathing technique</strong> (inhale 4, hold 7, exhale 8) was developed by Dr. Andrew Weil based on pranayama breathing practices. The extended exhale activates the <strong>vagus nerve</strong>, which triggers the parasympathetic nervous system — your body's "rest and digest" mode.</p>
    <p>A 2017 study in <em>Frontiers in Psychology</em> found that diaphragmatic breathing significantly reduced cortisol levels (the stress hormone) after just 8 weeks of practice. Research suggests that even a single session may help you feel calmer and more grounded. bloom offers this without any streak or pressure — it's here whenever you need it.</p>`,
    sources: [
      'Ma, X., et al. (2017). The effect of diaphragmatic breathing on attention, negative affect, and stress. <em>Frontiers in Psychology</em>, 8, 874.',
      'Gerritsen, R. J. S. & Band, G. P. H. (2018). Breath of life: The respiratory vagal stimulation model of contemplative activity. <em>Frontiers in Human Neuroscience</em>, 12, 397.',
    ],
  },
  cues: {
    title: 'Habit cues',
    tip: 'Linking a habit to an existing routine makes you 2-3x more likely to follow through.',
    full: `<p><strong>Implementation intentions</strong> — the formal term for "if-then planning" — are one of the most reliable findings in behavioral psychology. Peter Gollwitzer's research showed that people who specified <em>when</em> and <em>where</em> they would perform a behavior were <strong>2–3x more likely</strong> to actually do it.</p>
    <p>The mechanism is simple: by linking a new habit to an existing cue ("After I pour my coffee, I will take my medication"), you bypass the need for motivation or willpower. The existing routine acts as an automatic prompt. bloom calls these "cues" and shows them beneath each habit as a gentle reminder.</p>`,
    sources: [
      'Gollwitzer, P. M. (1999). Implementation intentions: Strong effects of simple plans. <em>American Psychologist</em>, 54(7), 493–503.',
      'Milkman, K. L., et al. (2021). Megastudies: A framework for large-scale interventions. <em>Nature</em>, 600, 478–483.',
    ],
  },
  buddy: {
    title: 'Bloom buddy',
    tip: 'Having even one person who checks in on you significantly improves follow-through and emotional wellbeing.',
    full: `<p>Decades of research on <strong>social support and health</strong> show that perceived social support — simply knowing someone is aware of your efforts — is one of the strongest predictors of sustained behavior change. A landmark meta-analysis by Holt-Lunstad et al. found that strong social connections improved the odds of survival by <strong>50%</strong>, making loneliness a health risk comparable to smoking.</p>
    <p>bloom buddy applies this through <strong>mutual accountability</strong>: your buddy can see your streak and completion percentage (not your private data), and you can see theirs. This light-touch visibility leverages what behavioral scientists call the <strong>Köhler effect</strong> — people work harder when they know someone is counting on them. Research by Irwin et al. showed that partnered exercise adherence was significantly higher than solo exercise, even when partners never spoke.</p>
    <p>Critically, bloom buddy is designed as <strong>encouragement, not surveillance</strong>. Your buddy gets notified when you're having a hard day so they can send support — not so they can judge. This mirrors findings from self-determination theory (Deci & Ryan) showing that autonomy-supportive relationships foster intrinsic motivation, while controlling ones undermine it.</p>`,
    sources: [
      'Holt-Lunstad, J., et al. (2010). Social relationships and mortality risk: A meta-analytic review. <em>PLoS Medicine</em>, 7(7), e1000316.',
      'Irwin, B. C., et al. (2012). Aerobic exercise is promoted when individual performance affects the group: A test of the Köhler motivation gain effect. <em>Annals of Behavioral Medicine</em>, 44(2), 151–159.',
      'Deci, E. L. & Ryan, R. M. (2000). The "what" and "why" of goal pursuits: Human needs and the self-determination of behavior. <em>Psychological Inquiry</em>, 11(4), 227–268.',
    ],
  },
  wall: {
    title: 'Encouragement wall',
    tip: 'Giving kindness to strangers benefits you as much as receiving it. Anonymous generosity reduces stress and increases wellbeing.',
    full: `<p>Research on <strong>prosocial behavior</strong> consistently shows that helping others — even strangers, even anonymously — improves the helper's own mood, reduces stress, and increases a sense of meaning. A study by Dunn et al. published in <em>Science</em> demonstrated that spending money on others produced greater happiness than spending on oneself, regardless of income.</p>
    <p>The encouragement wall applies the concept of <strong>anonymous prosocial action</strong>: writing a kind word for a stranger you'll never meet. This removes social performance anxiety while preserving the wellbeing benefits. Research by Lyubomirsky et al. found that performing acts of kindness — particularly varied ones — significantly increased happiness over a 10-week period.</p>
    <p>There's also a <strong>receiving</strong> benefit: reading kind words from anonymous strangers activates a sense of common humanity, a core component of Kristin Neff's model of <strong>self-compassion</strong>. Knowing that someone out there thought of you — without knowing you — can counter the isolation that often accompanies difficult mental health days.</p>`,
    sources: [
      'Dunn, E. W., et al. (2008). Spending money on others promotes happiness. <em>Science</em>, 319(5870), 1687–1688.',
      'Lyubomirsky, S., et al. (2005). Pursuing happiness: The architecture of sustainable change. <em>Review of General Psychology</em>, 9(2), 111–131.',
      'Neff, K. D. (2003). Self-compassion: An alternative conceptualization of a healthy attitude toward oneself. <em>Self and Identity</em>, 2(2), 85–101.',
    ],
  },
  grounding: {
    title: '5-4-3-2-1 Grounding',
    tip: 'Naming what your senses notice pulls your brain out of anxious thought loops and back into the present moment.',
    full: `<p>The <strong>5-4-3-2-1 grounding technique</strong> is one of the most widely recommended interventions for acute anxiety, panic, and dissociation. It works by redirecting attention from internal distress to <strong>sensory input</strong>, engaging the prefrontal cortex and interrupting the amygdala-driven fight-or-flight response.</p>
    <p>A 2015 review in <em>Journal of EMDR Practice and Research</em> found that grounding techniques significantly reduced distress in trauma survivors. The mechanism is simple: when you force your brain to count and categorize sensory details, it can't simultaneously sustain a panic spiral. Research on <strong>attentional deployment</strong> (a core emotion regulation strategy identified by James Gross) confirms that deliberately shifting attention to neutral or positive stimuli reduces negative emotional intensity.</p>`,
    sources: [
      'Najavits, L. M. (2002). Seeking Safety: A treatment manual for PTSD and substance abuse. <em>Guilford Press</em>.',
      'Gross, J. J. (1998). The emerging field of emotion regulation: An integrative review. <em>Review of General Psychology</em>, 2(3), 271–299.',
      'Brom, D., et al. (2017). A randomized controlled trial of EMDR and grounding exercises. <em>Journal of EMDR Practice and Research</em>, 11(4), 170–184.',
    ],
  },
  bodyscan: {
    title: 'Body scan',
    tip: 'Noticing your body without trying to fix it builds interoceptive awareness — a skill linked to better emotional regulation.',
    full: `<p>The <strong>body scan</strong> is a core component of Mindfulness-Based Stress Reduction (MBSR), developed by Jon Kabat-Zinn at UMass Medical School. It trains <strong>interoceptive awareness</strong> — the ability to sense internal body signals — which research has linked to improved emotional regulation, reduced anxiety, and greater self-awareness.</p>
    <p>A 2019 study in <em>Frontiers in Psychology</em> found that body scan meditation reduced cortisol reactivity and improved participants' ability to identify and tolerate difficult emotions. Critically, the technique asks you to <strong>notice without fixing</strong> — this non-judgmental observation is itself therapeutic, teaching the brain that discomfort can be acknowledged without requiring an immediate response.</p>
    <p>Bloom's body scan is intentionally brief (~3 minutes) to keep the barrier low. Research suggests that even short mindfulness practices produce measurable benefits when done consistently.</p>`,
    sources: [
      'Kabat-Zinn, J. (1990). Full catastrophe living: Using the wisdom of your body and mind to face stress, pain, and illness. <em>Delacorte Press</em>.',
      'Bornemann, B., et al. (2015). Differential changes in self-reported aspects of interoceptive awareness through 3 months of contemplative training. <em>Frontiers in Psychology</em>, 5, 1504.',
      'Creswell, J. D. (2017). Mindfulness interventions. <em>Annual Review of Psychology</em>, 68, 491–516.',
    ],
  },
  reframe: {
    title: 'Cognitive reframing',
    tip: 'You can\'t always control what happens, but reframing how you interpret it changes how it affects you.',
    full: `<p><strong>Cognitive reframing</strong> (or cognitive restructuring) is one of the most evidence-backed techniques in psychology, forming the foundation of Cognitive Behavioral Therapy (CBT). The core principle: emotions are driven not by events themselves, but by our <strong>interpretation</strong> of those events. Changing the interpretation changes the emotional response.</p>
    <p>A 2012 meta-analysis in <em>Clinical Psychology Review</em> found that cognitive reappraisal was associated with lower depression, lower anxiety, and greater wellbeing across 306 samples. Research by Ochsner et al. using fMRI showed that when people consciously reframed negative stimuli, activity in the prefrontal cortex increased while amygdala activity decreased — literally dampening the brain's threat response.</p>
    <p>Bloom's "gentle reframe" is designed to be <strong>warm, not clinical</strong>. It validates the original feeling first, then offers a kinder perspective — mirroring the compassion-focused approach recommended by Paul Gilbert's research on compassionate mind training.</p>`,
    sources: [
      'Beck, A. T. (1979). Cognitive therapy and the emotional disorders. <em>Penguin Books</em>.',
      'Ochsner, K. N., et al. (2004). Reflecting upon feelings: An fMRI study of neural systems supporting the attribution of emotion to self and other. <em>Journal of Cognitive Neuroscience</em>, 16(10), 1746–1772.',
      'Aldao, A., et al. (2010). Emotion-regulation strategies across psychopathology: A meta-analytic review. <em>Clinical Psychology Review</em>, 30(2), 217–237.',
      'Gilbert, P. (2009). Introducing compassion-focused therapy. <em>Advances in Psychiatric Treatment</em>, 15(3), 199–208.',
    ],
  },
  hardday: {
    title: 'Hard day mode',
    tip: 'Reducing expectations on hard days is protective — it prevents the "I failed at everything" spiral.',
    full: `<p>When people are overwhelmed, long task lists create a <strong>perceived failure state</strong> — even completing 5 out of 10 tasks feels like failure rather than success. Research on <strong>goal adjustment</strong> shows that people who flexibly scale back their goals during difficult periods maintain better mental health than those who rigidly push through.</p>
    <p>bloom's hard day mode reduces your visible habits to just the top 2, turning an overwhelming list into something manageable. This isn't giving up — it's <strong>strategic conservation</strong>. On a hard day, brushing your teeth and drinking water might genuinely be enough. Completing 2 out of 2 feels like a win, which preserves motivation for tomorrow.</p>`,
    sources: [
      'Wrosch, C., et al. (2003). Adaptive self-regulation of unattainable goals. <em>Personality and Social Psychology Bulletin</em>, 29(12), 1494–1508.',
      'Carver, C. S. & Scheier, M. F. (2000). Scaling back goals and recalibration of the affect system. <em>American Psychologist</em>, 55(11), 1241–1252.',
    ],
  },
};

function showInfoTip(sectionId, event) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
  const section = SCIENCE_SECTIONS[sectionId];
  if (!section) return;
  const el = document.getElementById('info-tip-content');
  el.innerHTML = `
    <div style="font-family:Fraunces,serif;font-size:17px;color:var(--cream);margin-bottom:10px">${section.title}</div>
    <div style="font-size:14px;color:var(--text-secondary);line-height:1.7;margin-bottom:14px">${section.tip}</div>
    <button class="btn btn-ghost btn-sm" onclick="closeAllSheets();setTimeout(()=>openScienceSheet('${sectionId}'),350)" style="font-size:12px;color:var(--sky)">Learn more →</button>
  `;
  closeAllSheets();
  setTimeout(() => openSheet('info-tip-sheet'), 50);
}

function openScienceSheet(scrollTo) {
  const el = document.getElementById('science-content');
  let html = '';
  Object.entries(SCIENCE_SECTIONS).forEach(([id, s]) => {
    html += `<div id="science-${id}" style="margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.05)">
      <div style="font-family:Fraunces,serif;font-size:16px;color:var(--cream);margin-bottom:10px">${s.title}</div>
      <div style="font-size:13px;color:var(--text-secondary);line-height:1.8;margin-bottom:12px">${s.full}</div>
      <div style="font-size:11px;color:var(--text-muted);line-height:1.7">
        ${s.sources.map(src => `<div style="margin-bottom:6px;padding-left:12px;border-left:2px solid rgba(255,255,255,0.06)">${src}</div>`).join('')}
      </div>
    </div>`;
  });
  el.innerHTML = html;
  openSheet('science-sheet');
  if (scrollTo) {
    setTimeout(() => {
      const target = document.getElementById('science-' + scrollTo);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
  }
}

function infoIcon(sectionId) {
  return `<span onclick="showInfoTip('${sectionId}',event)" style="cursor:pointer;font-size:12px;color:var(--text-muted);opacity:0.5;margin-left:6px;vertical-align:middle" title="Why this matters">ⓘ</span>`;
}

export { openSheet, closeAllSheets, openCrisisSheet, SCIENCE_SECTIONS,
  showInfoTip, openScienceSheet, infoIcon };

window.openSheet = openSheet;
window.closeAllSheets = closeAllSheets;
window.openCrisisSheet = openCrisisSheet;
window.showInfoTip = showInfoTip;
window.openScienceSheet = openScienceSheet;
