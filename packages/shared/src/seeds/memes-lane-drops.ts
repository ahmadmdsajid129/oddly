/**
 * @file memes-lane-drops.ts
 * @package @oddly/shared
 *
 * Seed Runway of 14 Approved Memes Drops (70 questions total)
 * for Stage L4 / Phase 10O (Task P10O.05 / F35).
 *
 * Provides a 2-week launch runway for the dedicated Memes lane (slug = 'memes').
 * Each drop combines pick1, pick2of6, rank3, and slider7 with render_variant === 'meme',
 * and designates an eligible low-cardinality meme Telepathy question (Q5).
 */

import { buildMixedFormatMemesDrop, type MemesLaneDropDraft } from "../memes-lane.js";

export const SEED_MEMES_LANE_DROPS: MemesLaneDropDraft[] = [
  // Day 1: Morning Chaos & Snooze Battles
  buildMixedFormatMemesDrop({
    drop_date: "2026-11-25",
    theme_key: "morning_chaos",
    heroMeme: {
      template_key: "snooze-battle",
      prompt: "The morning alarm goes off at 6:00 AM. What is your honest caption?",
      tags: ["morning", "sleep", "routine"],
      options: [
        { label: "Just 5 more minutes (which turns into 45)", value: "snooze_5m" },
        { label: "Staring at the ceiling questioning my career choices", value: "stare_ceiling" },
        { label: "Instantly calculating how fast I can get ready if I skip shower", value: "math_speedrun" },
        { label: "Accepting my fate with eyes wide open but body frozen", value: "frozen_acceptance" },
      ],
    },
    pick2of6Meme: {
      template_key: "morning-coping",
      prompt: "Pick the two survival essentials you must touch before talking to anyone:",
      tags: ["morning", "coffee", "phone"],
      options: [
        { label: "Strong Black Coffee / Masala Chai", value: "caffeine" },
        { label: "Phone to check notifications with one eye open", value: "phone_check" },
        { label: "A cold splash of water on the face", value: "water_splash" },
        { label: "10 minutes of complete silence", value: "total_silence" },
        { label: "A hoodie that acts as emotional armor", value: "hoodie_armor" },
        { label: "Spotify morning acoustic playlist", value: "morning_music" },
      ],
    },
    rank3Meme: {
      template_key: "morning-alarm-ranks",
      prompt: "Rank these 3 alarm sounds by how much stress they induce in your soul:",
      tags: ["alarms", "sound", "stress"],
      items: [
        { label: "Radar / Classic Apple Alarm (Pure Trauma)", value: "radar_alarm" },
        { label: "Gentle acoustic guitar (Ruined forever)", value: "gentle_acoustic" },
        { label: "Loud radio blare / buzzer (Heart attack)", value: "loud_buzzer" },
      ],
    },
    slider7Meme: {
      template_key: "morning-zombie-scale",
      prompt: "Where do you land on the morning zombie spectrum before 9:00 AM?",
      tags: ["energy", "morning", "zombie"],
      left_label: "Barely sentient vegetable",
      right_label: "Hyperactive 5 AM CEO energy",
      mid_label: "Functional on autopilot",
    },
    telepathyMeme: {
      template_key: "telepathy-commute",
      prompt: "Telepathy Sync: If public commute has one empty seat next to a loud chewers vs standing for 40 mins, you:",
      tags: ["commute", "decisions", "telepathy"],
      options: [
        { label: "Stand for 40 minutes proudly", value: "stand_proud" },
        { label: "Take the seat and turn noise canceling to 100%", value: "seat_noise_cancel" },
        { label: "Switch to another compartment immediately", value: "switch_compartment" },
      ],
    },
  }),

  // Day 2: Work From Home & Zoom Realities
  buildMixedFormatMemesDrop({
    drop_date: "2026-11-26",
    theme_key: "work_from_home",
    heroMeme: {
      template_key: "zoom-camera-off",
      prompt: "When the host says 'Can everyone turn on their cameras for a quick group photo?':",
      tags: ["wfh", "zoom", "camera"],
      options: [
        { label: "Instant 'Camera not working, looking into it' in chat", value: "cam_broken" },
        { label: "Frantically throwing on a polo over pajama pants", value: "polo_pajamas" },
        { label: "Leaving meeting due to sudden 'wifi disconnection'", value: "leave_call" },
        { label: "Awkward thumbs up with blurred background hiding chaos", value: "thumbs_up" },
      ],
    },
    pick2of6Meme: {
      template_key: "wfh-distractions",
      prompt: "Pick two tabs open right now that are strictly NOT work-related:",
      tags: ["tabs", "procrastination", "wfh"],
      options: [
        { label: "Zillow / housing listings for cities you will never visit", value: "zillow_dreaming" },
        { label: "Deep dive Wikipedia article on ancient siege weapons", value: "wikipedia_hole" },
        { label: "Online cart with $300 worth of stuff you will abandon", value: "abandoned_cart" },
        { label: "10-hour lofi hip hop / white noise stream", value: "lofi_stream" },
        { label: "Reddit thread arguing about trivial pop culture", value: "reddit_rabbit_hole" },
        { label: "Flight search for one-way tickets to an island", value: "flight_search" },
      ],
    },
    rank3Meme: {
      template_key: "slack-status-ranks",
      prompt: "Rank these 3 Slack message greetings by how much dread they cause:",
      tags: ["slack", "messages", "dread"],
      items: [
        { label: "'Hi [Name]' with no follow-up text for 10 minutes", value: "hi_no_text" },
        { label: "'Do you have a quick 5 mins to hop on a huddle?'", value: "quick_huddle" },
        { label: "'Can you look at this spreadsheet real quick?'", value: "quick_spreadsheet" },
      ],
    },
    slider7Meme: {
      template_key: "wfh-ergonomics",
      prompt: "Rate your WFH posture throughout an average Thursday afternoon:",
      tags: ["ergonomics", "posture", "wfh"],
      left_label: "Shrimp folded into sofa",
      right_label: "Ergonomic standing desk perfection",
      mid_label: "Leaning tower of pillows",
    },
    telepathyMeme: {
      template_key: "telepathy-meeting-snack",
      prompt: "Telepathy Sync: During a meeting where you are muted, what are you chewing on?",
      tags: ["snacks", "habits", "telepathy"],
      options: [
        { label: "Crunchy potato chips timed carefully between mutes", value: "chips" },
        { label: "Endless iced water / tea sips", value: "tea_water" },
        { label: "Chewing on a pen / fingernails out of boredom", value: "pen_chew" },
      ],
    },
  }),

  // Day 3: Midnight Scroll & Screen Addiction
  buildMixedFormatMemesDrop({
    drop_date: "2026-11-27",
    theme_key: "midnight_scroll",
    heroMeme: {
      template_key: "bedtime-scroll",
      prompt: "It is 1:30 AM. You said you would sleep at 11:00 PM. Why are you still awake?",
      tags: ["insomnia", "scrolling", "night"],
      options: [
        { label: "Watching someone build a subterranean pool in the jungle", value: "subterranean_pool" },
        { label: "Reading reviews of a 4-slice toaster I don't need", value: "toaster_reviews" },
        { label: "Remembering an embarrassing thing I said in 2017", value: "cringe_memory" },
        { label: "One last Reel turned into a 90-minute trance", value: "reels_trance" },
      ],
    },
    pick2of6Meme: {
      template_key: "midnight-thoughts",
      prompt: "Pick two midnight thoughts that keep you staring at the dark ceiling:",
      tags: ["thoughts", "night", "overthinking"],
      options: [
        { label: "What if I just quit and moved to a remote farm?", value: "remote_farm" },
        { label: "Did I lock the front door? (I checked 3 times already)", value: "check_door" },
        { label: "The concept of time passing too fast", value: "time_passing" },
        { label: "Why did I say 'You too' when the waiter said 'Enjoy your meal'?", value: "waiter_awkward" },
        { label: "A brilliant business idea that makes no sense in daylight", value: "bad_startup_idea" },
        { label: "How sponges reproduce in the deep ocean", value: "sponge_biology" },
      ],
    },
    rank3Meme: {
      template_key: "blue-light-ranks",
      prompt: "Rank these night-time screen habits by how guilty they make you feel:",
      tags: ["screens", "habits", "guilt"],
      items: [
        { label: "Phone falling on your face when you dose off", value: "phone_face_drop" },
        { label: "Checking the alarm time and seeing 'Alarms set for 4h 12m from now'", value: "alarm_countdown" },
        { label: "Turning brightness to 0% and squinting like a bat", value: "brightness_zero" },
      ],
    },
    slider7Meme: {
      template_key: "night-owl-slider",
      prompt: "Where is your circadian rhythm on the night-owl scale?",
      tags: ["sleep", "energy", "night"],
      left_label: "Asleep by 9:30 PM with warm chamomile",
      right_label: "Alive only when the moon is at zenith (3 AM)",
      mid_label: "Midnight average citizen",
    },
    telepathyMeme: {
      template_key: "telepathy-night-water",
      prompt: "Telepathy Sync: That 3 AM sip of ice-cold nightstand water hits like:",
      tags: ["water", "night", "telepathy"],
      options: [
        { label: "Elixir of life blessed by ancient deities", value: "holy_elixir" },
        { label: "Cold shock that wakes you up too much", value: "cold_shock" },
        { label: "Neutral hydration requirement", value: "neutral_drink" },
      ],
    },
  }),

  // Day 4: Food Delivery & Cooking Regret
  buildMixedFormatMemesDrop({
    drop_date: "2026-11-28",
    theme_key: "food_delivery_struggles",
    heroMeme: {
      template_key: "cart-delivery-fee",
      prompt: "Food order: $12. Delivery fee + service charge + surge pricing: $26. You:",
      tags: ["food", "delivery", "money"],
      options: [
        { label: "Close the app in disgust and eat dry cereal", value: "eat_cereal" },
        { label: "Sigh, hit Place Order, and promise to never do it again", value: "order_anyway" },
        { label: "Spend 30 minutes adding random sides to reach free delivery", value: "add_sides" },
        { label: "Inspect the fridge for 5 minutes then come back and pay", value: "fridge_then_pay" },
      ],
    },
    pick2of6Meme: {
      template_key: "fridge-archetypes",
      prompt: "Pick two items lurking in your fridge door right now:",
      tags: ["fridge", "condiments", "food"],
      options: [
        { label: "A jar of artisanal mustard used exactly once", value: "mustard_once" },
        { label: "Collection of takeout soy sauce and ketchup packets", value: "sauce_packets" },
        { label: "A single withered lime holding on for dear life", value: "withered_lime" },
        { label: "Half an onion wrapped in silver foil like a mystery artifact", value: "half_onion" },
        { label: "Cold brew concentrate you swore you'd drink daily", value: "cold_brew_bottle" },
        { label: "Hot sauce bottle with dried crust around the cap", value: "crusty_hot_sauce" },
      ],
    },
    rank3Meme: {
      template_key: "cooking-disasters",
      prompt: "Rank these domestic cooking fails by frustration level:",
      tags: ["cooking", "kitchen", "fail"],
      items: [
        { label: "Burning garlic 30 seconds after putting it in the pan", value: "burnt_garlic" },
        { label: "Forgetting to turn the rice cooker switch on", value: "rice_cooker_off" },
        { label: "Dropping a full container of leftovers face down on floor", value: "dropped_leftovers" },
      ],
    },
    slider7Meme: {
      template_key: "spice-tolerance-slider",
      prompt: "Your actual spice tolerance when the restaurant says 'Level 3 Spicy':",
      tags: ["spicy", "food", "tolerance"],
      left_label: "Black pepper makes me cry",
      right_label: "Carolina Reaper on my morning eggs",
      mid_label: "Medium-spicy with emotional tissues",
    },
    telepathyMeme: {
      template_key: "telepathy-pizza-crust",
      prompt: "Telepathy Sync: Do you eat the pizza crust or leave the handles on the plate?",
      tags: ["pizza", "eating", "telepathy"],
      options: [
        { label: "Eat every crumb, crust is breadstick with dipping sauce", value: "eat_crust" },
        { label: "Leave all crust handles behind on the box lid", value: "leave_crust" },
        { label: "Eat half of them depending on fullness", value: "eat_some" },
      ],
    },
  }),

  // Day 5: Overthinking & Shower Thoughts
  buildMixedFormatMemesDrop({
    drop_date: "2026-11-29",
    theme_key: "shower_thoughts_overthinking",
    heroMeme: {
      template_key: "shower-argument",
      prompt: "Winning a fictional argument in the shower against someone you haven't seen in 4 years:",
      tags: ["shower", "argument", "overthinking"],
      options: [
        { label: "Delivering devastating one-liners while rinsing shampoo", value: "shampoo_oneliners" },
        { label: "Genuinely feeling victorious for 20 minutes afterwards", value: "victorious_feeling" },
        { label: "Realizing midway how unhinged I look gesturing at the tiles", value: "gesturing_at_tiles" },
        { label: "Ending with a polite mic drop under the warm spray", value: "polite_mic_drop" },
      ],
    },
    pick2of6Meme: {
      template_key: "shower-luxuries",
      prompt: "Pick two rituals that make a shower 10x better:",
      tags: ["shower", "routine", "relaxation"],
      options: [
        { label: "Shower speaker playing dramatic movie soundtracks", value: "movie_soundtrack" },
        { label: "Water temperature dialed to scorching hot magma", value: "scalding_water" },
        { label: "Sitting down on the floor contemplating the cosmos", value: "sit_on_floor" },
        { label: "Using the fancy body wash meant only for guests", value: "fancy_wash" },
        { label: "Fresh warm towel straight from the dryer", value: "dryer_towel" },
        { label: "Shaving with pinpoint surgical concentration", value: "surgical_shave" },
      ],
    },
    rank3Meme: {
      template_key: "brain-replay-ranks",
      prompt: "Rank these mental overthinking loops by frequency:",
      tags: ["loops", "overthinking", "brain"],
      items: [
        { label: "'Did that email sound too passive-aggressive?'", value: "email_tone" },
        { label: "'Should I have taken that other job/city opportunity?'", value: "alternate_life" },
        { label: "'Are my friends secretly annoyed by me right now?'", value: "paranoid_friends" },
      ],
    },
    slider7Meme: {
      template_key: "shower-temperature-slider",
      prompt: "Your preferred shower temperature setting:",
      tags: ["shower", "heat", "preferences"],
      left_label: "Refreshing cool mountain spring",
      right_label: "Boiling lobster pot / dragons breath",
      mid_label: "Comfortably warm like a hug",
    },
    telepathyMeme: {
      template_key: "telepathy-shampoo-first",
      prompt: "Telepathy Sync: In the shower, do you wash hair first or body first?",
      tags: ["shower", "habits", "telepathy"],
      options: [
        { label: "Hair first (gravity does the trick down)", value: "hair_first" },
        { label: "Body first (get warm and clean first)", value: "body_first" },
        { label: "Face first before anything else", value: "face_first" },
      ],
    },
  }),

  // Day 6: Weekend Introvert vs Extrovert
  buildMixedFormatMemesDrop({
    drop_date: "2026-11-30",
    theme_key: "weekend_introvert",
    heroMeme: {
      template_key: "plans-cancelled",
      prompt: "When someone texts 'Hey, so sorry but can we reschedule tonight?':",
      tags: ["weekend", "cancelled", "introvert"],
      options: [
        { label: "Typing 'Oh no so sad!' while aggressively celebrating inside", value: "inner_celebration" },
        { label: "Already in sweatpants before they finished typing", value: "already_sweatpants" },
        { label: "Instant relief as the social battery recharges 80%", value: "battery_boost" },
        { label: "Feeling slightly slighted for 3 seconds then putting on Netflix", value: "slight_then_netflix" },
      ],
    },
    pick2of6Meme: {
      template_key: "perfect-saturday",
      prompt: "Pick two ingredients for your ideal solitary Saturday:",
      tags: ["saturday", "weekend", "cozy"],
      options: [
        { label: "No alarms, waking up naturally past 10 AM", value: "no_alarms" },
        { label: "A video game or book that absorbs 6 hours uninterrupted", value: "immersive_game" },
        { label: "Fresh pastries and slow-drip coffee on the balcony", value: "pastry_balcony" },
        { label: "Cleaning the whole apartment until it smells like citrus", value: "deep_cleaning" },
        { label: "Watching a 3-hour movie with zero phone checking", value: "cinema_mode" },
        { label: "A solitary walk in the park with headphones on", value: "headphones_walk" },
      ],
    },
    rank3Meme: {
      template_key: "social-drains-ranks",
      prompt: "Rank these social obligations by how fast they deplete your social battery:",
      tags: ["social", "energy", "drains"],
      items: [
        { label: "A party where you only know the host who is busy", value: "only_know_host" },
        { label: "Dinner with 12 people at a loud restaurant splitting bill equally", value: "bill_splitting" },
        { label: "Networking mixer with mandatory icebreaker games", value: "networking_icebreaker" },
      ],
    },
    slider7Meme: {
      template_key: "introvert-extrovert-slider",
      prompt: "Where is your weekend social meter right now?",
      tags: ["introvert", "extrovert", "weekend"],
      left_label: "Cave hermit refusing sunlight",
      right_label: "Rave until 5 AM then brunch with 15 friends",
      mid_label: "Dinner with 2 trusted friends then home",
    },
    telepathyMeme: {
      template_key: "telepathy-sunday-scaries",
      prompt: "Telepathy Sync: What hour on Sunday evening do the 'Sunday Scaries' first tap on your shoulder?",
      tags: ["sunday", "scaries", "telepathy"],
      options: [
        { label: "5:00 PM (As the sun starts dipping)", value: "sun_dip_5pm" },
        { label: "8:30 PM (Right after dinner finishes)", value: "post_dinner_8pm" },
        { label: "Never (I refuse to acknowledge Monday until morning)", value: "refuse_scaries" },
      ],
    },
  }),

  // Day 7: Group Chat Dynamics & Memes
  buildMixedFormatMemesDrop({
    drop_date: "2026-12-01",
    theme_key: "group_chat_dynamics",
    heroMeme: {
      template_key: "group-chat-silent",
      prompt: "Sending a meme you found hilarious into the main group chat and getting 0 reactions for 3 hours:",
      tags: ["groupchat", "memes", "awkward"],
      options: [
        { label: "Deleting it hoping nobody saw it", value: "delete_quietly" },
        { label: "Standing on business: it was art, they lack taste", value: "stand_on_business" },
        { label: "Sending a follow-up 'Anyway...' to change topic", value: "change_topic" },
        { label: "Laughing at my own joke alone in my room", value: "laugh_alone" },
      ],
    },
    pick2of6Meme: {
      template_key: "chat-roles",
      prompt: "Pick two roles you inevitably play in your closest WhatsApp/Signal group:",
      tags: ["roles", "friends", "groupchat"],
      options: [
        { label: "The silent observer who drops a meme once a week", value: "silent_lurker" },
        { label: "The logistics officer trying to get 4 people to agree on dinner", value: "logistics_officer" },
        { label: "The 3-minute voice-note sender who never types", value: "voicenote_sender" },
        { label: "The instigator who drops controversial hot takes then leaves", value: "hot_take_instigator" },
        { label: "The fact-checker dropping links with 'Actually...'", value: "fact_checker" },
        { label: "The heart-react emoji spammer to every single message", value: "heart_spammer" },
      ],
    },
    rank3Meme: {
      template_key: "chat-annoyances-ranks",
      prompt: "Rank these messaging habits by annoyance factor:",
      tags: ["chat", "habits", "annoyance"],
      items: [
        { label: "Sending 12 one-word messages in rapid succession with chime on", value: "rapid_one_words" },
        { label: "Typing bubble appearing and disappearing for 7 minutes", value: "typing_bubble" },
        { label: "Calling without texting first to see if you are free", value: "unannounced_call" },
      ],
    },
    slider7Meme: {
      template_key: "unread-messages-slider",
      prompt: "How many unread notifications/badges are on your messaging apps right now?",
      tags: ["inbox", "notifications", "chat"],
      left_label: "0 unread (Inbox Zero purist)",
      right_label: "9,999+ (Chaos goblin)",
      mid_label: "About 15-20 unread group chats",
    },
    telepathyMeme: {
      template_key: "telepathy-voicenote-speed",
      prompt: "Telepathy Sync: At what playback speed do you listen to friend voice notes?",
      tags: ["voicenotes", "audio", "telepathy"],
      options: [
        { label: "1.5x (Optimal efficiency without chipmunk voice)", value: "speed_1_5x" },
        { label: "1.0x (Normal human speed as intended)", value: "speed_1_0x" },
        { label: "2.0x (Get to the point immediately)", value: "speed_2_0x" },
      ],
    },
  }),

  // Day 8: Gym Motivation Fade
  buildMixedFormatMemesDrop({
    drop_date: "2026-12-02",
    theme_key: "gym_motivation_fade",
    heroMeme: {
      template_key: "gym-motivation",
      prompt: "Going to the gym for 3 consecutive days and immediately checking in mirror for abs:",
      tags: ["fitness", "gym", "mirror"],
      options: [
        { label: "Posing under downward lighting convinced change is real", value: "lighting_pose" },
        { label: "Soreness makes me walk like a freshly hatched penguin", value: "penguin_walk" },
        { label: "Rewarding myself with a 1,200 calorie smoothie", value: "smoothie_reward" },
        { label: "Writing a mental memoir on my athletic discipline", value: "mental_memoir" },
      ],
    },
    pick2of6Meme: {
      template_key: "workout-essentials",
      prompt: "Pick two workout accessories that carry your entire gym session:",
      tags: ["gym", "gear", "motivation"],
      options: [
        { label: "Noise-cancelling over-ear headphones (do not approach)", value: "over_ear_headphones" },
        { label: "An enormous water jug with motivational timestamps", value: "gallon_water" },
        { label: "Pre-workout powder that makes your skin tingle with rage", value: "pre_workout" },
        { label: "A playlist featuring heavy metal or 2000s pop anthems", value: "pop_anthem_playlist" },
        { label: "Lifting straps for weights you definitely can't lift alone", value: "lifting_straps" },
        { label: "A baseball cap pulled down low to avoid eye contact", value: "low_cap" },
      ],
    },
    rank3Meme: {
      template_key: "gym-excuses-ranks",
      prompt: "Rank these 3 excuses you use to skip the gym:",
      tags: ["excuses", "fitness", "skip"],
      items: [
        { label: "'It looks like it might rain in 4 hours'", value: "might_rain" },
        { label: "'I need to let my muscles rest and recover today'", value: "recovery_day" },
        { label: "'My workout clothes are still in the wash'", value: "clothes_in_wash" },
      ],
    },
    slider7Meme: {
      template_key: "fitness-dedication-slider",
      prompt: "Your actual consistency level with workout routines over the past year:",
      tags: ["consistency", "fitness", "habits"],
      left_label: "Gym card used solely for locker room showers",
      right_label: "Strict 6-day PPL split rain or shine",
      mid_label: "2 weeks on, 3 weeks off cycle",
    },
    telepathyMeme: {
      template_key: "telepathy-leg-day",
      prompt: "Telepathy Sync: How do you honestly feel about Leg Day?",
      tags: ["legday", "gym", "telepathy"],
      options: [
        { label: "Love it, favorite day of the week", value: "love_legs" },
        { label: "Dread it with every fiber of my being", value: "dread_legs" },
        { label: "Tolerate it because chicken legs look weird", value: "tolerate_legs" },
      ],
    },
  }),

  // Day 9: Impulse Shopping & Package Tracking
  buildMixedFormatMemesDrop({
    drop_date: "2026-12-03",
    theme_key: "impulse_buying",
    heroMeme: {
      template_key: "package-tracking",
      prompt: "Refreshing package tracking 4 minutes after ordering with standard 5-day shipping:",
      tags: ["shopping", "tracking", "packages"],
      options: [
        { label: "'Label created' is my favorite romantic literature", value: "label_created" },
        { label: "Checking if the driver is on my street already", value: "checking_map" },
        { label: "Forgot what I even bought when the cardboard box arrives", value: "forgot_what_bought" },
        { label: "Already researching my next unrelated purchase", value: "next_purchase" },
      ],
    },
    pick2of6Meme: {
      template_key: "impulse-triggers",
      prompt: "Pick two categories that trigger instant 'Add to Cart' with zero remorse:",
      tags: ["shopping", "impulse", "retail"],
      options: [
        { label: "Kitchen gadgets that do one hyper-specific thing (avocado slicer)", value: "kitchen_gadget" },
        { label: "Books that will sit on the nightstand looking wise and unread", value: "unread_books" },
        { label: "Skincare serums promising radiant glass skin in 3 days", value: "skincare_serum" },
        { label: "Stationery / blank notebooks with superior paper grain", value: "blank_notebook" },
        { label: "Snacks from other countries with mysterious packaging", value: "foreign_snacks" },
        { label: "Cable organizers and tech pouches for wires I don't own", value: "tech_pouches" },
      ],
    },
    rank3Meme: {
      template_key: "buyer-remorse-ranks",
      prompt: "Rank these feelings after hitting 'Complete Purchase':",
      tags: ["remorse", "shopping", "feelings"],
      items: [
        { label: "Instant dopamine spike that lasts 45 seconds", value: "dopamine_spike" },
        { label: "Cold wave of financial awareness 10 minutes later", value: "financial_dread" },
        { label: "Convincing myself it is an 'investment in my future self'", value: "future_investment" },
      ],
    },
    slider7Meme: {
      template_key: "saving-vs-spending-slider",
      prompt: "Your spending discipline when you spot something 40% off:",
      tags: ["money", "discipline", "spending"],
      left_label: "Strict Warren Buffett frugality",
      right_label: "Money is just numbers on a screen let's live",
      mid_label: "Budget-conscious with occasional splurges",
    },
    telepathyMeme: {
      template_key: "telepathy-delivery-opening",
      prompt: "Telepathy Sync: When a package arrives at your door, do you open it instantly or let it sit on the table?",
      tags: ["packages", "habits", "telepathy"],
      options: [
        { label: "Rip it open with keys/bare hands within 30 seconds", value: "instant_rip" },
        { label: "Let it sit on the entrance table for 2 days like a trophy", value: "table_trophy" },
        { label: "Open neatly with scissors after finishing current task", value: "neat_scissors" },
      ],
    },
  }),

  // Day 10: Tech Panic & Battery at 2%
  buildMixedFormatMemesDrop({
    drop_date: "2026-12-04",
    theme_key: "tech_battery_anxiety",
    heroMeme: {
      template_key: "low-battery-2pct",
      prompt: "Phone hits 2% battery and you are still 20 minutes away from home:",
      tags: ["battery", "tech", "panic"],
      options: [
        { label: "Screen brightness to minimum, airplane mode, praying to tech gods", value: "airplane_prayer" },
        { label: "Closing all 47 background apps like that will save it", value: "close_all_apps" },
        { label: "Accepting the quiet peaceful void of being unreachable", value: "peaceful_void" },
        { label: "Walking briskly like the phone is a ticking bomb", value: "brisk_walk" },
      ],
    },
    pick2of6Meme: {
      template_key: "tech-annoyances",
      prompt: "Pick two modern tech frustrations that test your patience:",
      tags: ["tech", "frustrations", "digital"],
      options: [
        { label: "Bluetooth pairing to your car instead of your earbuds", value: "car_bluetooth" },
        { label: "Websites asking you to accept cookies with 18 toggle switches", value: "cookie_toggles" },
        { label: "Forgetting a password and being told 'New password cannot be old password'", value: "password_error" },
        { label: "Two-factor authentication code arriving 8 minutes late", value: "slow_2fa" },
        { label: "Auto-correct changing a real word into a bizarre capitalized surname", value: "autocorrect_fail" },
        { label: "App updating right when you are in line to pay with it", value: "payment_update" },
      ],
    },
    rank3Meme: {
      template_key: "storage-full-ranks",
      prompt: "Rank these 3 digital storage warnings by irritation:",
      tags: ["storage", "cloud", "irritation"],
      items: [
        { label: "'iCloud Storage is Full (50GB of 50GB)' everyday for 3 years", value: "icloud_full" },
        { label: "'Cannot take photo: Storage space is full' during a rare moment", value: "photo_blocked" },
        { label: "'Computer will restart in 10 minutes to install updates'", value: "restart_warning" },
      ],
    },
    slider7Meme: {
      template_key: "battery-charging-habit",
      prompt: "When do you typically plug your phone in to charge?",
      tags: ["battery", "habits", "charging"],
      left_label: "Plugs in at 75% just to be safe",
      right_label: "Rides at 1% for 4 hours like a daredevil",
      mid_label: "Hits charger around 15-20% low battery chime",
    },
    telepathyMeme: {
      template_key: "telepathy-dark-mode",
      prompt: "Telepathy Sync: Dark mode or Light mode for your primary phone interface?",
      tags: ["interface", "darkmode", "telepathy"],
      options: [
        { label: "Dark mode 24/7/365 everywhere without exception", value: "dark_mode_always" },
        { label: "Light mode during the day, auto-switching at sunset", value: "auto_switch" },
        { label: "Light mode all the time (built for solar glare)", value: "light_mode_always" },
      ],
    },
  }),

  // Day 11: Social Awkwardness & Small Talk
  buildMixedFormatMemesDrop({
    drop_date: "2026-12-05",
    theme_key: "social_awkwardness",
    heroMeme: {
      template_key: "elevator-small-talk",
      prompt: "Stepping into an elevator with a neighbor you vaguely know:",
      tags: ["elevator", "smalltalk", "awkward"],
      options: [
        { label: "Pretending to be extremely fascinated by the floor number display", value: "floor_display" },
        { label: "Engaging in hard-hitting journalism about today's humidity", value: "weather_report" },
        { label: "Quick tight-lipped smile and immediately pulling out phone", value: "phone_defense" },
        { label: "Friendly wave that turns into an accidental salute", value: "accidental_salute" },
      ],
    },
    pick2of6Meme: {
      template_key: "awkward-moments",
      prompt: "Pick two public awkward moments that make you want to evaporate:",
      tags: ["awkward", "public", "social"],
      options: [
        { label: "Waving back enthusiastically at someone who was waving to the person behind you", value: "wrong_wave" },
        { label: "Pushing a door that clearly has a giant brass PULL sign", value: "push_pull_door" },
        { label: "Walking into a glass door with complete confidence", value: "glass_door" },
        { label: "Tripping on flat pavement and pretending to break into a brisk jog", value: "trip_into_jog" },
        { label: "Saying 'Bye!' and then both walking in the exact same direction for 4 blocks", value: "same_direction_walk" },
        { label: "Stomach making a whale mating sound in a dead-silent lecture room", value: "stomach_whale" },
      ],
    },
    rank3Meme: {
      template_key: "small-talk-topics",
      prompt: "Rank these classic small talk topics by dullness level:",
      tags: ["smalltalk", "conversation", "topics"],
      items: [
        { label: "'Crazy weather we are having this week, huh?'", value: "weather_talk" },
        { label: "'Working hard or hardly working?'", value: "hardly_working" },
        { label: "'Traffic on the bridge was unbelievable today'", value: "traffic_talk" },
      ],
    },
    slider7Meme: {
      template_key: "small-talk-slider",
      prompt: "How good are you at maintaining casual small talk with strangers?",
      tags: ["smalltalk", "social", "strangers"],
      left_label: "Paralyzed mute who can only nod",
      right_label: "Could charm a brick wall for 2 hours",
      mid_label: "Can manage 90 seconds before running out of fuel",
    },
    telepathyMeme: {
      template_key: "telepathy-greeting-choice",
      prompt: "Telepathy Sync: Meeting an acquaintance in an informal setting: handshake, fist-bump, or awkward half-hug?",
      tags: ["greeting", "friends", "telepathy"],
      options: [
        { label: "Casual nod / peace sign from 3 feet away", value: "peace_sign" },
        { label: "Firm handshake with direct eye contact", value: "handshake" },
        { label: "Fist-bump (zero skin contact confusion)", value: "fist_bump" },
      ],
    },
  }),

  // Day 12: Music & Repeat Mode Addiction
  buildMixedFormatMemesDrop({
    drop_date: "2026-12-06",
    theme_key: "music_repeat_mode",
    heroMeme: {
      template_key: "one-song-repeat",
      prompt: "Finding a new song and listening to it 74 times in a row until all dopamine is drained:",
      tags: ["music", "spotify", "repeat"],
      options: [
        { label: "Listening until I know the breathing patterns of the backing vocals", value: "backing_vocals" },
        { label: "Hating the song 4 days later and skipping it forever", value: "hate_in_4_days" },
        { label: "Creating entire cinematic movie scenes in my head while walking", value: "cinematic_scenes" },
        { label: "Forcing my best friend to listen with 'Wait for the beat drop at 2:14'", value: "force_friend" },
      ],
    },
    pick2of6Meme: {
      template_key: "music-quirks",
      prompt: "Pick two habits in your music listening lifestyle:",
      tags: ["music", "habits", "quirks"],
      options: [
        { label: "Having a playlist with 800 songs but shuffling only the same 12", value: "same_12_songs" },
        { label: "Needing music to do literally anything (showering, laundry, cooking)", value: "music_for_everything" },
        { label: "Rewinding 15 seconds because a thought interrupted the best lyric", value: "rewind_interrupted" },
        { label: "Listening to sad acoustic songs on sunny joyful afternoons", value: "sad_songs_sunny" },
        { label: "Singing gibberish with 100% emotional conviction", value: "gibberish_conviction" },
        { label: "Judging people subtly by their Spotify Wrapped top 5 artists", value: "wrapped_judgment" },
      ],
    },
    rank3Meme: {
      template_key: "audio-disasters",
      prompt: "Rank these headphone / audio nightmares:",
      tags: ["headphones", "audio", "nightmare"],
      items: [
        { label: "Earbuds disconnecting and blasting music through phone speakers on a quiet bus", value: "public_speaker_blast" },
        { label: "One earbud dying while the other still has 80% battery", value: "one_earbud_dead" },
        { label: "Headphone cable catching on a doorknob and ripping out of your ears", value: "doorknob_snag" },
      ],
    },
    slider7Meme: {
      template_key: "playlist-organization",
      prompt: "How curated and organized are your music playlists?",
      tags: ["playlists", "organization", "music"],
      left_label: "One giant 'Liked Songs' landfill with 2,500 tracks",
      right_label: "Meticulously sorted by mood, BPM, and season",
      mid_label: "A few genre bins with chaotic overlap",
    },
    telepathyMeme: {
      template_key: "telepathy-lyrics-vs-beat",
      prompt: "Telepathy Sync: In music, what captivates your brain first?",
      tags: ["music", "taste", "telepathy"],
      options: [
        { label: "The beat, groove, and instrumental production", value: "beat_production" },
        { label: "The lyrics, poetry, and storytelling", value: "lyrics_poetry" },
        { label: "The melody and vocal tone", value: "melody_vocal" },
      ],
    },
  }),

  // Day 13: Monday Blues & Motivation
  buildMixedFormatMemesDrop({
    drop_date: "2026-12-07",
    theme_key: "monday_blues",
    heroMeme: {
      template_key: "monday-morning-brain",
      prompt: "Monday morning 9:00 AM standing in front of your computer screen:",
      tags: ["monday", "work", "routine"],
      options: [
        { label: "Typing random letters in search bar so it looks like I am working", value: "fake_typing" },
        { label: "Staring at an open email for 12 minutes without reading a word", value: "staring_at_email" },
        { label: "Drinking tea like it's a potion that will grant me competence", value: "potion_drinking" },
        { label: "Mentally planning my Friday evening 108 hours in advance", value: "planning_friday" },
      ],
    },
    pick2of6Meme: {
      template_key: "monday-comforts",
      prompt: "Pick two things that make getting through Monday tolerable:",
      tags: ["monday", "comfort", "survival"],
      options: [
        { label: "Planning an exceptional lunch to look forward to all morning", value: "fancy_lunch" },
        { label: "Complain-bonding with coworkers about how fast weekend went", value: "coworker_bonding" },
        { label: "Putting off major decisions until Tuesday morning", value: "tuesday_postpone" },
        { label: "Listening to upbeat synthwave on maximum volume", value: "synthwave_volume" },
        { label: "Wearing the softest, most forgiving clothes possible", value: "forgiving_clothes" },
        { label: "Treating myself to a specialty bakery treat", value: "bakery_treat" },
      ],
    },
    rank3Meme: {
      template_key: "monday-phrases",
      prompt: "Rank these Monday email phrases by how much eye-rolling they produce:",
      tags: ["emails", "phrases", "monday"],
      items: [
        { label: "'Hope you had a restful and restorative weekend!'", value: "restful_weekend" },
        { label: "'Happy Monday! Let's hit the ground running!'", value: "hit_ground_running" },
        { label: "'Circling back on my email from Friday 5:58 PM'", value: "friday_circle_back" },
      ],
    },
    slider7Meme: {
      template_key: "monday-vitality",
      prompt: "Your vital life force level on an average Monday afternoon:",
      tags: ["vitality", "energy", "monday"],
      left_label: "Flickering candle in a wind tunnel",
      right_label: "Atomic reactor humming with productivity",
      mid_label: "Surviving on lukewarm coffee and sheer willpower",
    },
    telepathyMeme: {
      template_key: "telepathy-commute-mode",
      prompt: "Telepathy Sync: How do you spend the Monday morning commute?",
      tags: ["commute", "routine", "telepathy"],
      options: [
        { label: "Audiobook / educational podcast trying to better my life", value: "podcast_betterment" },
        { label: "Brain completely offline staring out the window like a dramatic movie", value: "window_stare" },
        { label: "Furious scrolling through social feeds and news", value: "social_scrolling" },
      ],
    },
  }),

  // Day 14: Brain Buffering & Password Amnesia
  buildMixedFormatMemesDrop({
    drop_date: "2026-12-08",
    theme_key: "brain_buffering",
    heroMeme: {
      template_key: "walk-into-room-forget",
      prompt: "Walking into a room with complete purpose and immediately forgetting why you walked in:",
      tags: ["memory", "brain", "forgetting"],
      options: [
        { label: "Staring into the middle distance waiting for brain to reload", value: "brain_reload" },
        { label: "Walking back to the previous room to retrace physical steps", value: "retrace_steps" },
        { label: "Pretending I just wanted to inspect this random shelf", value: "inspect_shelf" },
        { label: "Accepting that the thought is lost in the ether forever", value: "lost_in_ether" },
      ],
    },
    pick2of6Meme: {
      template_key: "brain-glitches",
      prompt: "Pick two everyday brain buffering glitches you experience regularly:",
      tags: ["brain", "glitches", "habits"],
      options: [
        { label: "Throwing the spoon in the trash and the yogurt cup in the sink", value: "spoon_in_trash" },
        { label: "Searching for your phone using your phone's flashlight", value: "phone_flashlight" },
        { label: "Looking for glasses that are currently sitting on your face", value: "glasses_on_face" },
        { label: "Trying to unlock your front door by tapping your car key fob", value: "car_fob_door" },
        { label: "Saying 'Thank you' to an automated vending machine or ATM", value: "thank_atm" },
        { label: "Reading the same paragraph 4 times without comprehending a single word", value: "read_4_times" },
      ],
    },
    rank3Meme: {
      template_key: "password-struggles",
      prompt: "Rank these password security rituals by frustration:",
      tags: ["passwords", "security", "frustration"],
      items: [
        { label: "'Must contain 1 uppercase, 1 lowercase, 1 number, and 1 ancient hieroglyph'", value: "hieroglyph_req" },
        { label: "Clicking all squares containing a motorcycle (including the tiny 2-pixel handlebar)", value: "captcha_motorcycle" },
        { label: "Resetting password to the exact password you thought you were typing", value: "same_password_reset" },
      ],
    },
    slider7Meme: {
      template_key: "brain-ram-slider",
      prompt: "How much active RAM does your brain have available right now?",
      tags: ["ram", "memory", "brain"],
      left_label: "Dial-up modem buffering a 240p video",
      right_label: "Fiber-optic quantum supercomputer",
      mid_label: "Decent laptop with 42 browser tabs open",
    },
    telepathyMeme: {
      template_key: "telepathy-lost-item",
      prompt: "Telepathy Sync: When you lose your keys or wallet at home, where is the first place you check?",
      tags: ["keys", "wallet", "telepathy"],
      options: [
        { label: "Pockets of yesterday's jacket / pants", value: "yesterday_pockets" },
        { label: "Entrance console / key hook bowl", value: "key_hook_bowl" },
        { label: "Between the couch cushions", value: "couch_cushions" },
      ],
    },
  }),
];

