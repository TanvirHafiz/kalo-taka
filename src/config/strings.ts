import { BALANCE } from './balance';

// Every player-facing string lives here so a Bangla translation can be added later.
// Rule: no em dashes in in-game text.

export const STRINGS = {
  title: 'Kalo Taka Private Limited',
  disclaimer: 'Any resemblance to any real bhai is purely coincidental.',
  start: 'Start',
  tagline: 'From tin shed to sky tower. Paperwork optional.',

  hud: {
    taka: 'Taka',
    income: 'Income',
    plots: 'Plots',
    media: 'Media Heat',
    anger: 'Tenant Anger',
    committee: 'Committee',
    influence: 'Influence',
    stars: 'Offshore Stars',
    boost: '3x income',
    calendar: 'Month {m}, Day {d}',
    mediaHelp: 'Media Heat: food, shops and hospitals lose customers. Above 60 the committee starts watching.',
    angerHelp: 'Tenant Anger: housing loses tenants.',
    committeeHelp: 'Committee Attention: at 100, an inquiry freezes a building.',
    influenceHelp: 'Influence: cheaper speed money and bribes, less heat.',
    starsHelp: 'Offshore Stars: +10% income each, forever.',
  },

  buttons: {
    build: 'Build',
    posters: 'Posters',
    nephews: 'Nephews',
    flee: 'Flee',
    settings: 'Settings',
    later: '{name} opens in a later update.',
  },

  build: {
    title: 'Build',
    onPlot: 'On plot #{n}',
    noEmptyPlot: 'Buy or clear a plot first, sir.',
    locked: 'Unlocks with your first {tier}',
    perSec: '{rate} at level 1',
  },

  categories: {
    housing: 'Housing',
    food: 'Food',
    healthcare: 'Healthcare',
    retail: 'Retail',
  },

  district: {
    lockedSign: '{name} opens at {rate}',
    welcome: 'Welcome to {name}',
  },

  plot: {
    emptyTitle: 'Empty plot #{n}',
    unownedTitle: 'Plot #{n} for sale',
    buyLegally: 'Buy legally',
    build: 'Build {name}',
    upgrade: 'Upgrade',
    merge: 'Merge with #{n}',
    mergeHint: 'Needs a maxed neighbour of the same type',
    tierLevel: 'Tier {tier}/{maxTier}, Level {level}/{max}',
    mediaLine: 'Media Heat is costing {pct} of customers',
    maxLevel: 'Level {max} (maxed)',
    incomeLine: 'Earns {rate}',
    bonusLine: 'Neighbours: {bonus}',
    backRow: 'Back row: earns 80%',
    patients: '{n} patients',
    buyX1: 'x1',
    buyX10: 'x10',
    buyMax: 'Max',
    upgradeN: 'Upgrade x{n}',
    close: 'Close',
  },

  permit: {
    build: 'Permit: construction',
    upgrade: 'Permit: renovation',
    merge: 'Permit: merger',
    fill: 'Filling the {pond}',
    waiting: '{label}: {secs}s left',
    speedLabels: ['Speed Money', 'Tea Money', "Sir's Coffee Fund", 'Processing Fee (unofficial)'],
    busy: 'The permit office is still stamping this one.',
  },

  grab: {
    action: 'Grab it',
    note: 'Free. Media will talk.',
    ponds: ['pond', 'wetland', 'playground', 'riverbank'],
    flag: 'Grabbed',
  },

  inquiry: {
    title: 'Anti-Durniti Committee',
    notice: 'Under inquiry: {secs}s',
    wait: 'Wait it out',
    waitNote: 'Free. Earns nothing until it ends.',
    talkShow: 'TV talk-show appearance',
    talkShowNote: 'Freeze time halved',
    donation: 'Donation photo-op',
    donationNote: 'Freeze lifted, +20 Influence',
    envelope: 'Brown envelope',
    envelopeNote: 'Freeze lifted. Might leak.',
    quotes: [
      '"I have never seen money in my life. Only cheques."',
      '"The pond filled itself. Nature is very generous."',
      '"My nephew is just helping. For free. Mostly."',
      '"The building was always 9 floors. The permit is shy."',
      '"Corruption? In this economy? Impossible."',
    ],
  },

  tenants: {
    waterPump: 'Fix the water pump',
    waterPumpNote: '-20 Tenant Anger',
    bachelors: 'Allow bachelors',
    bachelorsNote: '-10 Tenant Anger, once. Neighbours may complain.',
  },

  posters: {
    title: 'Posters',
    intro: 'Your face on every wall, rickshaw and lamp post. Influence +10 while it lasts.',
    buy: 'New poster campaign',
    journalists: 'Pay off journalists',
    journalistsNote: '-{n} Media Heat. Stories become "positive coverage".',
    slogan: 'SHOBAR BHAI',
    active: '{n} campaign(s) running',
    fades: 'Freshest fades in {mins} min',
  },

  nephews: {
    title: 'Nephews',
    intro: 'Family runs the business. Family also takes a cut.',
    hire: 'Hire',
    upgrade: 'Upgrade',
    fire: 'Fire',
    hired: 'On payroll',
    locked: 'Unlocks: {when}',
    skim: 'Skims {pct}',
    totalSkim: 'Nephews skim {pct}',
    names: { rony: 'Rent Collector Rony', polash: 'Permit Bhai Polash', mithu: 'Media Bhagne Mithu', dipu: 'Driver Dipu' },
    does: {
      rony: 'Collects cash bags for you at {pct} value',
      polash: 'Permit waits {pct} shorter',
      mithu: 'Media Heat fades {pct} faster',
      dipu: 'Offline earnings cap {hours} h (from the next update)',
    },
    unlock: { rony: 'own 5 buildings', polash: 'your first merge', mithu: 'your first inquiry', dipu: 'your first tier 5 building' },
    maxed: 'Fully trained',
    level: 'Lv {n}/{max}',
  },

  /** Healthcare: each level is sold as a new test. Index = level. */
  testsByLevel: [
    '',
    'Level 1: Blood pressure, once',
    'Level 2: Sugar test for everyone',
    'Level 3: X-ray, just to be safe',
    'Level 4: ECG for a sprained ankle',
    'Level 5: Full body checkup package',
    'Level 6: Vitamin D test for everyone',
    'Level 7: MRI with free biscuit',
    'Level 8: Second opinion, same doctor',
    'Level 9: 14 tests, 1 price',
    'Level 10: Test to see if tests needed',
  ],

  bags: {
    bhara: 'bhara',
    chanda: 'chanda',
    commission: 'commission',
    collected: '{kind} collected: {amount}',
  },

  errors: {
    notEnoughTaka: 'Not enough Taka, sir.',
    plotNotOwned: 'You do not own this plot. Yet.',
    plotAlreadyOwned: 'Already yours, sir.',
    plotOccupied: 'Something is already built here.',
    plotEmpty: 'Nothing to upgrade here.',
    noSuchPlot: 'That plot does not exist.',
    maxLevel: 'Already at level {max}. Time to merge.',
    notAdjacent: 'Plots must be next to each other.',
    differentType: 'Buildings must be the same type and tier.',
    notMaxed: 'Both buildings must be level {max}.',
    maxTier: 'This is the tallest tower. Even the sky said no.',
    notBuildable: 'Permit office says this category is not open yet.',
    noPlotsLeft: 'No plots left in this district.',
    nothingToCollect: 'Too late, sir. Someone else took it.',
    noEvent: 'That moment has passed, sir.',
    noEmptyPlot: 'You need an empty plot you own, sir.',
    sideBizHere: 'A side business is running here until the event ends.',
    cannotFlee: 'Not worth fleeing yet, sir. Earn more first.',
    destinationLocked: 'That destination needs more Offshore Stars.',
    permitPending: 'The permit office is still stamping this one.',
    frozen: 'Frozen by the committee. Wait, or "resolve" it.',
    notFrozen: 'No inquiry here, sir.',
    noPermit: 'Nothing waiting on a permit here.',
    alreadyDone: 'Already done, sir.',
    nephewLocked: 'This nephew is not asking for a job yet.',
    nephewHired: 'Already on the payroll.',
    nephewNotHired: 'Not on the payroll.',
    nephewMaxed: 'Fully trained already.',
    noHousing: 'You have no tenants to fix things for.',
  },

  art: {
    toLet: 'TO-LET',
    forSale: 'JOMI BIKROY',
    forSaleSub: 'for sale',
    reserved: 'COMING SOON',
    reservedSub: 'by the owner',
    helipad: 'H',
    cha: 'CHA 10 TK',
    buffet: 'All You Can Eat ৳2,999',
    friday: 'Doctor sits Friday only',
    tests: '14 tests, 1 price',
    emergency: 'EMERGENCY',
    vip: 'VIP WING',
    outOfOrder: 'OUT OF ORDER',
    sale: 'SALE SALE',
    footpathRent: 'Footpath for rent',
    escalator: 'ESCALATOR!',
    cinema: 'CINEMA',
    themePark: 'INDOOR THEME PARK',
    flyover: 'OWN EXIT',
    biryani: 'KACCHI READY',
  },

  toasts: {
    welcomeBack: 'While you were away, the buildings collected {amount}.',
    built: '{name} built. Tenants already queueing.',
    merged: 'Merged into {name}!',
    loadFailed: 'Old save was damaged. Started fresh, backup kept.',
    briefcase: 'Envelope received. Do not ask from whom.',
    unlockedCategory: '{name} unlocked. The permit office is suddenly friendly.',
    district: '{name} is open for business. And for grabbing.',
    backRow: 'Back row unlocked. Plots behind plots, sir.',
    grabbed: 'Trucks are filling the {pond}. Ducks can relocate.',
    inquiry: 'Anti-Durniti Committee is "discussing" {name}.',
    inquiryOver: 'Inquiry closed. Nothing was found. As usual.',
    leaked: 'The envelope leaked to the press. Media Heat up.',
    poster: 'Posters up. Your face is now on 400 walls.',
    journalists: 'Journalists paid. Tomorrow: "Tycoon very handsome".',
    hired: '{name} joins the company. Salary: a cut of everything.',
    fired: 'Your Khala is upset. Tenant Anger up.',
    speedPaid: 'Stamped. The officer says hello.',
    nephewUnlocked: '{name} is asking for a job, sir.',
  },
} as const;

export type ErrorKey = keyof typeof STRINGS.errors;

/** Signboard name word lists: first word + second word. All invented. */
export const NAME_WORDS = {
  housing: {
    first: ['Shanti', 'Rahman', 'Ma', 'Bhai Bhai', 'Golden', 'Royal', 'Nur', 'Moyna', 'Dulal', 'Kobutor', 'Shapla', 'Bismillah'],
    second: ['Nibash', 'Villa', 'Tower', 'Bhaban', 'Heights', 'Kutir', 'Mansion', 'Palace', 'Garden'],
  },
  healthcare: {
    first: ['Modern', 'Hi-Tech', 'Popular', 'Ibn', 'Life Care', 'Shefa', 'Arogya', 'New Hope', 'Sunrise', 'Moyna'],
    second: ['Diagnostic', 'Medical', 'Hospital', 'Clinic', 'Health Point', 'Care Centre'],
  },
  food: {
    first: ['Star', 'Haji', 'Nanna', "Sultan's", 'Kacchi', 'Old Town', 'Mama', 'Bhai Bhai', 'Royal', 'Moja'],
    second: ['Biryani', 'Kitchen', 'Café', 'Hotel & Restaurant', 'Kabab Ghor', 'Tea Point'],
  },
  retail: {
    first: ['Galaxy', 'Padma', 'Twin', 'New', 'Metro', 'Jomuna', 'Shapla', 'Rupali', 'Unique'],
    second: ['Plaza', 'City', 'Complex', 'Market', 'Shopping Centre', 'Bitan'],
  },
} as const;

/**
 * Lowercased full names that must never be generated, in case a combination
 * collides with a real, well-known brand or building. Extend as needed.
 */
export const NAME_BLOCKLIST: readonly string[] = [
  'royal tower', 'golden tower',
  'haji biryani', 'nanna biryani', 'star kabab ghor', 'star hotel & restaurant', "sultan's kitchen", 'kacchi kitchen',
  'popular diagnostic', 'popular medical', 'popular hospital', 'ibn hospital', 'ibn diagnostic', 'ibn medical',
  'new market', 'twin tower', 'jomuna city', 'jomuna plaza',
];

/** Fill {slots} in a template. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

/** Error text with shared slots filled in. */
export function errorText(key: ErrorKey): string {
  return fmt(STRINGS.errors[key], { max: BALANCE.maxLevel });
}

// ---------------------------------------------------------------------------------------------
// Comedy pools (M5). Rules: Banglish in English letters, each line under 70 characters, the joke
// is on the tycoon, officials and fixers, never on tenants, patients or workers. No real people,
// parties, brands or religious mockery; Ramadan content stays warm.

/** News ticker. Slots: {building} {district} {amount} {nephew}. */
export const TICKER = {
  built: [
    'Local tycoon opens {building}, says it is "for the people"',
    '{building} opens in {district}; ribbon cut, rules also cut',
    'New {building} in {district} approved in record 30 seconds',
    '{district} welcomes {building}; neighbours welcome earplugs',
  ],
  merged: [
    'Two buildings become one; permit office calls it "a miracle"',
    '{building} rises in {district}, height not shown on any map',
    'Tycoon merges plots, says ducks were consulted',
    'Experts baffled as {building} grows overnight in {district}',
  ],
  grabbed: [
    'Pond in {district} mysteriously becomes a building site',
    'Playground in {district} relocated to "somewhere nicer"',
    'Wetland in {district} declared "basically dry" by owner',
    'Riverbank in {district} moves 30 metres, river not informed',
  ],
  inquiry: [
    'Committee forms committee to investigate committee',
    'Anti-Durniti Committee visits {building}; tea is served',
    'Inquiry into {building} "very serious", say officials, yawning',
  ],
  inquiryOver: [
    'Inquiry concludes: nothing found, file also not found',
    'Committee clears tycoon after "very productive" lunch',
  ],
  poster: [
    'Tycoon posters now outnumber trees in {district}',
    'Man finds his own face replaced by tycoon on old photo',
    'Rickshaw pullers ask for poster rent; request under review',
  ],
  speed: [
    'Permit office reports record efficiency on Thursdays',
    'Officer buys new car on government salary, credits "savings"',
  ],
  nephew: [
    '{nephew} spotted in new Prado, says it is "company car"',
    '{nephew} appointed to the board; board has no other members',
  ],
  wealth: [
    'Traffic jam in {district} now visible from space',
    'Tycoon net worth crosses {amount}; tycoon says "just a start"',
  ],
  talkShow: [
    'Tycoon on TV: "I have never seen money. Only cheques."',
    'Tycoon on TV: "The pond filled itself. Nature is generous."',
    'Tycoon on TV: "My nephew helps for free. Mostly."',
    'Tycoon on TV: "The building was always 9 floors."',
    'Tycoon on TV: "Corruption? In this economy? Impossible."',
  ],
  events: {
    loadShedding: ['Load-shedding hits {district}; generators sold out in 4 minutes'],
    monsoon: ['Roads in {district} now rivers; boat rentals open'],
    hartal: ['Hartal strands buses in {district}; parking suddenly costs more'],
    dengue: ['Dengue season: hospitals full. Tycoon sad, also very rich'],
    rentHike: ['January arrives; rents rise by tradition'],
    gas: ['Gas line trouble in {district}; cylinders become treasure'],
    vip: ['VIP visit closes roads; welcome gates appear overnight'],
    journalist: ['Journalist asks questions in {district}; tea not offered'],
    prado: ['{nephew} crashes Prado into other Prado; both "company cars"'],
    election: ['Election season: walls run out of space for posters'],
    ramadan: ['Ramadan begins; iftar tables fill the streets of {district}'],
    flyover: ['New flyover opens; it reaches the next flyover in 9 minutes'],
  },
  filler: [
    'Hospital adds 14th mandatory test; patients "feeling healthier"',
    'Load-shedding schedule published, load-shedding ignores it',
    'Rickshaw fares rise again; tycoon calls it "market forces"',
    'Survey: 9 in 10 tycoons support rules for other people',
    'Lake declared "decorative"; fish asked to vacate',
    'Building collapses into compliance after 40 years',
    'Tycoon donates fan to school, names wing after himself',
    'Cafe charges extra for "plastic plant ambience"',
    'Government to build flyover to reach other flyover',
    'Tea stall owner earns more than permit officer, officer upset',
    'Mall opens third escalator; nation celebrates',
    'Committee meeting postponed; committee on vacation',
    'Tycoon says rents "very fair", tenants say "water?"',
    'Doctor seen on a Friday; city in shock',
    'City plans new park, tycoon plans same land',
    'Rains flood city; tycoon offers boats, at a price',
    'Study: buildings without permits feel "more free"',
    'Tycoon nephew opens startup; product is "connections"',
  ],
};

/** Manager Mamun: tutorial, offline report, events and idle chatter. */
export const MAMUN = {
  name: 'Manager Mamun',
  tutorial: [
    'Sir, first plot is free. Build a Tin-Shed Ghor, let us start.',
    'See the Taka coming in? That is called rent. Very normal.',
    'Now upgrade it once, sir. Tenants love a fresh coat of paint.',
    'Buy the next plot, sir. My uncle at the bank owes me a favour.',
    'Build another Tin-Shed on it. Two is a business, one is a hobby.',
    'Max both to level 10. I have arranged a small loan, sir.',
    'Merge them, sir. The permit office already said yes.',
    'Congratulations sir, you are now officially a developer.',
  ],
  loan: 'Starter loan arranged, sir. Repayment terms: friendship.',
  skip: 'Skip tutorial',
  next: 'Okay',
  offline: 'Sir, your nephews collected {amount} while you slept. They kept 75% for petrol.',
  idle: [
    'Sir, permit office says 30 seconds. I said you are a busy man.',
    'Very normal, sir. Everyone fills ponds. Ducks can relocate.',
    'Sir, tenants say no water 3 days. I said water is a state of mind.',
    'The committee wants to "discuss". I have prepared the envelope.',
    'Sir, the journalist is asking questions. Very rude of him.',
    'Your nephew wants a promotion, sir. He wants to be your uncle.',
    'Sir, the officer called. He misses you. And your wallet.',
    'Good news sir, nobody read the inquiry report. Including us.',
    'Sir, a tenant asked for a receipt. I told him it is spiritual.',
    'The lift is working today, sir. Please do not tell anyone.',
    'Sir, rain is coming. I have ordered boats and higher rents.',
    'Sir, the poster on lamp post 4 looks very handsome. Like you.',
    'Sir, our accountant has two calculators. One is for the tax man.',
    'Sir, a man wants to sell us a river. Shall I say yes?',
  ],
  events: {
    loadShedding: 'Sir, load-shedding again. Generators are available, of course.',
    monsoon: 'Sir, the roads are rivers. Tap the boats, sir. They pay.',
    hartal: 'Hartal day, sir. Buses are stranded. A parking lot would help.',
    dengue: 'Dengue season, sir. Hospitals are full. Very sad. Very busy.',
    rentHike: 'Sir, it is January. Raise all rents by 20%? Tradition, sir.',
    gas: 'Gas line problem, sir. Tenants are angry. Cylinders are profit.',
    vip: 'A VIP is visiting, sir. Roads closed. A welcome gate helps.',
    journalist: 'Sir, a journalist is sniffing around. Ad space solves this.',
    prado: 'Sir, your nephew crashed the Prado. Into another Prado.',
    election: 'Election season, sir! Posters are half price. Faces everywhere.',
    ramadan: 'Ramadan Mubarak, sir. An iftar for the tenants would be kind.',
    flyover: 'A new flyover opened, sir. One of our buildings faces it now.',
  },
};

/** Event names and response buttons. */
export const EVENT_TEXT = {
  names: {
    loadShedding: 'Load-shedding', monsoon: 'Monsoon waterlogging', hartal: 'Hartal day', dengue: 'Dengue season',
    rentHike: 'January rent hike', gas: 'Gas line problem', vip: 'VIP visit', journalist: 'Journalist sniffing',
    prado: 'Nephew crashed the Prado', election: 'Election season', ramadan: 'Ramadan', flyover: 'Flyover inaugurated',
  },
  choices: {
    generator: 'Buy generators for dark buildings',
    boats: 'Tap the boats for cash',
    parking: 'Open a bus parking lot',
    cylinder: 'Open a cylinder shop',
    nets: 'Donate mosquito nets (+15 Influence)',
    accept: 'Raise rents 20% for 10 min',
    decline: 'Not this year',
    gate: 'Pay for a welcome gate (+25 Influence)',
    ads: 'Buy ad space in their paper',
    ignore: 'Ignore',
    pay: 'Pay for the damage',
    blame: 'Blame the rickshaw',
    spree: 'Open Posters',
    iftar: 'Host an iftar (-40 Anger, +10 Influence)',
    ribbon: 'Ribbon-cutting photo-op (+10 Influence)',
    later: 'Later',
  },
  ends: '{name}: {secs}s left',
  noEmptyPlot: 'You need an empty plot you own, sir.',
};

/** Prestige: Flee to Canada. */
export const FLEE = {
  button: 'Flee',
  title: 'Flee to Canada',
  intro: 'Sell everything, escape abroad, and let the Jamai restart the business.',
  offer: '+{n} Offshore Stars',
  total: 'You will have {n} Offshore Stars: +{pct} income forever',
  keeps: 'Kept: Offshore Stars, nephew training, stats. Gone: Taka, plots, buildings, heat, posters.',
  destination: 'Where to, sir?',
  confirm: 'Flee now',
  lockedAt: 'Unlocks at {n} stars',
  perksTitle: 'Family perks (by total stars)',
  destinations: {
    toronto: { name: 'Toronto (Begum Para)', perk: 'Next run: housing +25%' },
    kl: { name: 'Kuala Lumpur Second Home', perk: 'Next run: permit waits -25%' },
    dubai: { name: 'Dubai Marina', perk: 'Next run: speed money -30%' },
    london: { name: 'London Flat', perk: 'Next run: Media Heat fades 50% faster' },
    island: { name: 'Undisclosed Island', perk: 'Next run: all heat gain -25%' },
  },
  perks: [
    'Jamai starts with 3 plots instead of 1',
    'Start with ৳10 crore',
    'Food and healthcare unlock one housing tier earlier',
    'Inquiries last 3 minutes instead of 5',
    'Start each run with a free Rod-Wala Dotola',
  ],
  cutscene: [
    'Businessman goes abroad for medical treatment',
    'Condition stable. Assets also stable.',
    'Meanwhile, the Jamai arrives with a hard hat.',
  ],
  skip: 'Skip',
  toast: 'Welcome back, Jamai. Grandfather left you {n} stars and a cousin.',
};

/** Speech bubbles: 30 per building type. Tenants, patients and customers are never the joke. */
export const BUBBLES = {
  housing: [
    'Bhaiya, water nai 3 din', 'Rent again increased?!', 'Lift is decoration only', 'Who parked on my clothesline?',
    'Gas is gone again', 'Landlord bhai, the roof leaks', 'Generator only for landlord?', 'My cat loves this balcony',
    'Kids, homework, now!', 'Neighbour plays music at 2 am', 'Is the guard sleeping again?', 'Tea on the roof tonight?',
    'Who took my slippers?', 'Rent receipt please, bhaiya', 'Ceiling fan has two speeds: off', 'Load-shedding again?',
    'Water tank is empty, sir', 'Our building has a new floor?', 'Who is building on the pond?', 'Mosquitoes pay rent too',
    'Nice breeze on the balcony', 'Electric bill bigger than rent', 'Ma is cooking hilsa today', 'Stairs again, lift is resting',
    'Why is the rent in dollars?', 'Tenant meeting at 8, bring tea', 'At least the view is nice', 'Bachelors? Here? Allowed?',
    'Home sweet home, mostly', 'Is that a new crack?',
  ],
  healthcare: [
    'Doctor will come Friday, inshallah', 'Why 14 tests for a cold?', 'Serial number 247, still waiting', 'Is this a hospital or a mall?',
    'They gave me a receipt and a cough', 'Ambulance has not moved in years', 'X-ray for my headache?', 'Nurse apa is so kind',
    'My test results are a novel', 'Lift is on leave today', 'Bed number 9, there are 8 beds', 'Waiting room has better WiFi',
    'Doctor saw me for 40 seconds', 'Medicine costs more than the visit', 'They want a test to read the test', 'Get well soon, Nanu',
    'Just need a paracetamol, bhai', 'Hold my place in the queue', 'Is the doctor real?', 'Discount if I bring my cousin?',
    'Vitamin D for everyone, again', 'Nice nurse, strict guard', 'Pharmacy closed, pharmacist open', 'My chest feels better already',
    'They charged for the chair', 'The canteen samosa healed me', 'Long line, short doctor', 'Thank you, Doctor apa',
    'Report ready next Friday', 'Please, one more test, they say',
  ],
  food: [
    'Kacchi is finished already?!', 'One more cup of cha, bhai', 'Too much salt, perfect', 'Table for 12, quick',
    'Where is my biryani?', 'Extra potato please', 'Is the AC real or painted?', 'This borhani is magic',
    'Who ordered the guitar?', 'Buffet, so I eat for three days', 'Waiter bhai, the bill please', 'Pay now, eat later?',
    'Cha with extra sugar', 'Best fuchka in the city', 'Plastic plants look so real', 'Wifi password is the menu?',
    'My mother cooks better', 'One plate, four spoons', 'Selfie with the biryani pot', 'Is the rooftop cafe legal?',
    'Lassi is love', 'Food is good, chair is broken', 'Dessert first, life is short', 'Same logo, three floors',
    'Is there a table without a queue?', 'Kebab was worth the wait', 'Came for tea, stayed for dinner', 'Spicy! Water please!',
    'Uncle, one singara', 'Iftar here tomorrow?',
  ],
  retail: [
    'Sale sale sale!', 'Price fixed? Really fixed?', 'This shirt fits nobody', 'Escalator ride, two times!',
    'Just looking, bhai', 'Is this original?', 'Last price, sister?', 'Cinema tickets sold out',
    'Footpath shop, footpath price', 'Where is the exit?', 'Food court on the 9th floor', 'Shoes for Eid already?',
    'Bargain lesson today', 'Mall AC is my holiday', 'Came for socks, bought a fridge', 'Who owns this footpath?',
    'Fountain is the best part', 'Parking costs more than shopping', 'Lift or escalator, decisions', 'Indoor theme park? Wow!',
    'My wallet is crying', 'New phone cover, same phone', 'Gift for Nanu, any ideas?', 'Discount for students?',
    'Flyover takes me straight in', 'Bazaar smells like spices', 'Trial room queue, again', 'Half price, twice',
    'One more shop, then home', 'Window shopping only today',
  ],
  /** Event-specific lines, shown during that event. */
  events: {
    loadShedding: ['Current gone again!', 'Hand fan time', 'Generator for landlord only?'],
    monsoon: ['Knee-deep in the lobby', 'Boat to the office today', 'My shoes are swimming'],
    hartal: ['No bus today, bhai', 'Walking 6 km, again', 'Shops shut, tea open'],
    dengue: ['Mosquito net please', 'Platelet test, again', 'Coil burning all night'],
    rentHike: ['Again rent up?!', 'January is cruel', 'No bachelors now? Why?'],
    gas: ['No gas, cooking on a heater', 'Cylinder price doubled?', 'Stove is just a decoration'],
    vip: ['Road closed for 3 hours', 'Who is this VIP?', 'Sirens, sirens, sirens'],
    journalist: ['A reporter asked me questions', 'Will we be on TV?', 'Say nothing, bhai'],
    prado: ['Two Prados, one wall', 'Who drives like that?', 'The rickshaw is innocent'],
    election: ['So many posters!', 'Which face is which?', 'Miking all day long'],
    ramadan: ['Iftar in 10 minutes!', 'Jilapi line is long', 'Ramadan Kareem, neighbour'],
    flyover: ['New flyover! So fast!', 'Where does it go?', 'Our road has a roof now'],
  },
};

/** Tutorial overlay and misc M5 UI text. */
export const M5_TEXT = {
  ticker: 'BREAKING',
  fleeReady: 'Flee: +{n} stars',
};
