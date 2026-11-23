/**
 * @file rich-questions.ts
 * @package @oddly/shared
 *
 * Seed batch of 12 sample questions per richer format (48 questions total)
 * for Stage L2 / Phase 10M (Task P10M.07).
 */

export interface SamplePick2Of6Question {
  format: "pick2of6";
  lane_slug: string;
  prompt: string;
  options: Array<{ label: string; value: string }>;
}

export interface SampleRank3Question {
  format: "rank3";
  lane_slug: string;
  prompt: string;
  items: Array<{ label: string; value: string }>;
}

export interface SampleSlider7Question {
  format: "slider7";
  lane_slug: string;
  prompt: string;
  left_label: string;
  right_label: string;
  mid_label?: string;
}

export interface SampleSceneQuestion {
  format: "scene";
  lane_slug: string;
  prompt: string;
  scene_asset_key: string;
  cards: Array<{ label: string; value: string; caption: string }>;
}

export const SAMPLE_RICH_QUESTIONS = {
  pick2of6: [
    {
      format: "pick2of6" as const,
      lane_slug: "food",
      prompt: "Two street food items that never miss on a rainy evening:",
      options: [
        { label: "Steaming Samosa with Mint Chutney", value: "samosa" },
        { label: "Crispy Masala Vada", value: "masala_vada" },
        { label: "Piping Hot Chai & Bun Maska", value: "chai_bun" },
        { label: "Spicy Maggi with Extra Cheese", value: "spicy_maggi" },
        { label: "Golden Pakoras (Onion & Mirchi)", value: "pakora" },
        { label: "Roasted Sweet Corn (Bhutta)", value: "bhutta" },
      ],
    },
    {
      format: "pick2of6" as const,
      lane_slug: "memes",
      prompt: "Pick two internet reaction archetypes that represent your brain at 2 AM:",
      options: [
        { label: "Overthinking Kermit in a Trench Coat", value: "kermit_trench" },
        { label: "This is Fine Dog in Flames", value: "this_is_fine" },
        { label: "Woman Yelling at Smug White Cat", value: "yelling_woman_cat" },
        { label: "Galaxy Brain Transcendence", value: "galaxy_brain" },
        { label: "Confused Math Lady Calculating Taxes", value: "math_lady" },
        { label: "Shocked Pikachu Face", value: "shocked_pikachu" },
      ],
    },
    {
      format: "pick2of6" as const,
      lane_slug: "gaming",
      prompt: "Two game genres you can sink 100+ hours into without blinking:",
      options: [
        { label: "Expansive Open World RPGs", value: "open_world_rpg" },
        { label: "Cozy Farming & Town Sims", value: "cozy_farming" },
        { label: "Sweaty Competitive Tactical Shooters", value: "competitive_fps" },
        { label: "Roguelikes with 'Just One More Run'", value: "roguelike" },
        { label: "High-Action Soulslikes & Boss Fights", value: "soulslike" },
        { label: "Deep City Builders & Grand Strategy", value: "city_builder" },
      ],
    },
    {
      format: "pick2of6" as const,
      lane_slug: "work",
      prompt: "Two things that instantly boost your afternoon work focus:",
      options: [
        { label: "Instrumental Lo-Fi / Synthwave Beats", value: "lofi_beats" },
        { label: "A Fresh Cold Brew or Strong Espresso", value: "cold_brew" },
        { label: "Putting All Messaging Apps on 'Do Not Disturb'", value: "dnd_mode" },
        { label: "Clearing Every Stray Item off the Desk", value: "clean_desk" },
        { label: "A Quick 10-Minute Walk Outside", value: "quick_walk" },
        { label: "A Hard 25-Minute Pomodoro Sprint", value: "pomodoro" },
      ],
    },
    {
      format: "pick2of6" as const,
      lane_slug: "music",
      prompt: "Two musical elements that give you involuntary goosebumps:",
      options: [
        { label: "A Sudden Emotional Key Change", value: "key_change" },
        { label: "An Explosive Bass Drop", value: "bass_drop" },
        { label: "Haunting Acoustic Vocal Harmony", value: "vocal_harmony" },
        { label: "A Blistering Guitar Solo Peak", value: "guitar_solo" },
        { label: "A Swelling Cinematic String Section", value: "strings" },
        { label: "Intimate Raw Vocals with Near Silence", value: "raw_intimate" },
      ],
    },
    {
      format: "pick2of6" as const,
      lane_slug: "movies",
      prompt: "Two movie tropes you will happily watch every single time:",
      options: [
        { label: "The Meticulous Heist Planning Montage", value: "heist_montage" },
        { label: "Enemies Forced to Team Up for Survival", value: "enemies_teamup" },
        { label: "The Plot Twist That Rewrites the Whole Film", value: "mind_twist" },
        { label: "A High-Stakes Legal Courtroom Duel", value: "courtroom" },
        { label: "A Found Family Celebrating Dinner", value: "found_family" },
        { label: "The Mentor Passing the Torch in Climax", value: "mentor_torch" },
      ],
    },
    {
      format: "pick2of6" as const,
      lane_slug: "everyday",
      prompt: "Two small everyday rituals you fiercely protect from interruption:",
      options: [
        { label: "The First Morning Coffee in Complete Silence", value: "morning_coffee" },
        { label: "Late-Night Solo Walking with Headphones", value: "night_walk" },
        { label: "Reading 30 Minutes in Bed Before Sleep", value: "bedtime_reading" },
        { label: "Unwinding with a Hot Shower After Work", value: "hot_shower" },
        { label: "Sunday Morning Slow Breakfast", value: "slow_breakfast" },
        { label: "Browsing Curated Playlists for New Songs", value: "curating_music" },
      ],
    },
    {
      format: "pick2of6" as const,
      lane_slug: "deep",
      prompt: "Two human virtues you value above all others in close friendships:",
      options: [
        { label: "Radical Emotional Candor", value: "candor" },
        { label: "Unwavering Loyalty Through Chaos", value: "loyalty" },
        { label: "Deep Philosophical Curiosity", value: "curiosity" },
        { label: "Gentle Unjudging Empathy", value: "empathy" },
        { label: "Relentless Sense of Humor", value: "humor" },
        { label: "Respect for Personal Solitude", value: "solitude" },
      ],
    },
    {
      format: "pick2of6" as const,
      lane_slug: "situations",
      prompt: "Two survival items you grab when stranded in an unfamiliar city for 12 hours:",
      options: [
        { label: "Fully Charged 20,000mAh Power Bank", value: "power_bank" },
        { label: "Reliable Noise-Cancelling Earbuds", value: "earbuds" },
        { label: "Comfortable Broken-in Walking Sneakers", value: "sneakers" },
        { label: "A Physical Pocket Paper Map & Notebook", value: "paper_map" },
        { label: "A Trusty Windproof Umbrella or Hoodie", value: "hoodie" },
        { label: "A Stash of Local Cash Banknotes", value: "cash" },
      ],
    },
    {
      format: "pick2of6" as const,
      lane_slug: "food",
      prompt: "Two pizza toppings that belong together for eternity:",
      options: [
        { label: "Fresh Basil & Buffalo Mozzarella", value: "basil_mozzarella" },
        { label: "Spicy Pepperoni & Hot Honey Drizzle", value: "pepperoni_honey" },
        { label: "Roasted Garlic & Wild Mushrooms", value: "garlic_mushroom" },
        { label: "Smoked Bacon & Caramelized Onions", value: "bacon_onion" },
        { label: "Kalamata Olives & Crumbled Feta", value: "olives_feta" },
        { label: "Fresh Pineapple & Jalapeño Peppers", value: "pineapple_jalapeno" },
      ],
    },
    {
      format: "pick2of6" as const,
      lane_slug: "gaming",
      prompt: "Two gaming accessories that are non-negotiable for your setup:",
      options: [
        { label: "Ultra-Lightweight Precision Mouse", value: "light_mouse" },
        { label: "Clicky Mechanical Keyboard with Custom Switches", value: "mech_keyboard" },
        { label: "High-Refresh Rate Ergonomic Monitor", value: "high_refresh" },
        { label: "Plush Memory Foam Wrist Rest", value: "wrist_rest" },
        { label: "Studio-Grade Open-Back Headphones", value: "studio_headphones" },
        { label: "Desk-Sized Stitched Mousepad Mat", value: "desk_mat" },
      ],
    },
    {
      format: "pick2of6" as const,
      lane_slug: "memes",
      prompt: "Two classic meme sounds forever rented in your head space:",
      options: [
        { label: "Metal Gear Solid Alert Sound (!)", value: "mgs_alert" },
        { label: "Windows XP Startup Chord", value: "windows_xp" },
        { label: "GTA San Andreas 'Ah here we go again'", value: "gta_again" },
        { label: "Directed by Robert B. Weide Theme", value: "robert_weide" },
        { label: "Anime 'Omae Wa Mou Shindeiru' Nani?!", value: "omae_wa" },
        { label: "Dramatic Vine Boom Sound Effect", value: "vine_boom" },
      ],
    },
  ],

  rank3: [
    {
      format: "rank3" as const,
      lane_slug: "everyday",
      prompt: "Rank these 3 morning wake-up priorities in the order you tackle them:",
      items: [
        { label: "Hydrate (Tall Glass of Water)", value: "water" },
        { label: "Check Phone Notifications & Messages", value: "phone" },
        { label: "Brew Hot Coffee or Tea", value: "brew" },
      ],
    },
    {
      format: "rank3" as const,
      lane_slug: "work",
      prompt: "Rank what matters most when considering your dream company:",
      items: [
        { label: "Radical Autonomy & Flexible Hours", value: "autonomy" },
        { label: "High Base Compensation & Financial Rewards", value: "compensation" },
        { label: "Deep Respect for Colleagues & Kind Culture", value: "culture" },
      ],
    },
    {
      format: "rank3" as const,
      lane_slug: "movies",
      prompt: "Rank these legendary film components from most to least vital to a masterpiece:",
      items: [
        { label: "A Tight, Unpredictable Screenplay", value: "screenplay" },
        { label: "Memorable Acting Performances", value: "acting" },
        { label: "Atmospheric Cinematography & Score", value: "cinematography" },
      ],
    },
    {
      format: "rank3" as const,
      lane_slug: "food",
      prompt: "Rank these meal courses by your personal appetite enthusiasm:",
      items: [
        { label: "Savory Appetizers & Crispy Starters", value: "starters" },
        { label: "Hearty Main Course Platter", value: "main" },
        { label: "Decadent Sweet Dessert & Coffee", value: "dessert" },
      ],
    },
    {
      format: "rank3" as const,
      lane_slug: "gaming",
      prompt: "Rank what ruins a video game fastest for you:",
      items: [
        { label: "Cluttered UI Full of Microtransactions", value: "microtransactions" },
        { label: "Tedious Unskippable Fetch Quests", value: "fetch_quests" },
        { label: "Clunky Unresponsive Movement Controls", value: "bad_controls" },
      ],
    },
    {
      format: "rank3" as const,
      lane_slug: "music",
      prompt: "Rank how you discover your favorite new music tracks:",
      items: [
        { label: "Personal Recommendations from Close Friends", value: "friends" },
        { label: "Serendipitous Discover Weekly Algorithm", value: "algorithm" },
        { label: "Movie / TV Show Soundtracks & Scenes", value: "soundtracks" },
      ],
    },
    {
      format: "rank3" as const,
      lane_slug: "situations",
      prompt: "Rank the discomfort of these three awkward social situations:",
      items: [
        { label: "Waving Back at Someone Who Wasn't Waving at You", value: "wrong_wave" },
        { label: "Forgetting the Name of Someone You Met 3 Times", value: "forgot_name" },
        { label: "Walking in the Same Direction After Saying Goodbye", value: "same_direction" },
      ],
    },
    {
      format: "rank3" as const,
      lane_slug: "memes",
      prompt: "Rank these timeless internet eras by sheer comedic greatness:",
      items: [
        { label: "Early YouTube & Impact Font Classics (2008-2012)", value: "impact_era" },
        { label: "The Golden Age of 6-Second Vines (2013-2016)", value: "vine_era" },
        { label: "Surreal Modern Shitpost Brainrot (2020-Present)", value: "modern_surreal" },
      ],
    },
    {
      format: "rank3" as const,
      lane_slug: "deep",
      prompt: "Rank these intellectual virtues by how much you admire them in thinkers:",
      items: [
        { label: "Intellectual Humility & Willingness to Unlearn", value: "humility" },
        { label: "Rigorous Analytical Clarity & Precision", value: "precision" },
        { label: "Bold Imaginative Vision Beyond Current Paradigms", value: "vision" },
      ],
    },
    {
      format: "rank3" as const,
      lane_slug: "work",
      prompt: "Rank these productivity friction points by how deeply they drain you:",
      items: [
        { label: "Meetings That Could Have Been a 2-Line Slack", value: "useless_meetings" },
        { label: "Ambiguous Specs Where Requirements Shift Mid-Flight", value: "shifting_specs" },
        { label: "Endless Slow CI/CD Test Pipeline Failures", value: "slow_ci" },
      ],
    },
    {
      format: "rank3" as const,
      lane_slug: "food",
      prompt: "Rank your go-to comfort carbohydrates when exhausted:",
      items: [
        { label: "Creamy Slow-Cooked Pasta", value: "pasta" },
        { label: "Steamy Fragrant Rice & Dal", value: "rice_dal" },
        { label: "Fresh Warm Crusty Bread with Salted Butter", value: "bread_butter" },
      ],
    },
    {
      format: "rank3" as const,
      lane_slug: "everyday",
      prompt: "Rank your ideal Sunday afternoon energy:",
      items: [
        { label: "Quiet Solitary Reading on the Sofa", value: "solitary_read" },
        { label: "Cooking an Elaborate Multi-Course Recipe", value: "elaborate_cook" },
        { label: "Spontaneous Outdoor Cafe Hopping with Friends", value: "cafe_hop" },
      ],
    },
  ],

  slider7: [
    {
      format: "slider7" as const,
      lane_slug: "everyday",
      prompt: "Where does your natural biological clock thrive?",
      left_label: "Dawn Riser",
      right_label: "Deep Night Owl",
      mid_label: "Flexible Mid-Day",
    },
    {
      format: "slider7" as const,
      lane_slug: "food",
      prompt: "Your true spice tolerance boundary:",
      left_label: "Sweet & Mild Only",
      right_label: "Nuclear Ghost Pepper",
      mid_label: "Balanced Heat",
    },
    {
      format: "slider7" as const,
      lane_slug: "work",
      prompt: "Your ideal daily work environment style:",
      left_label: "Rigidly Scheduled Blocks",
      right_label: "Pure Freeform Flow",
      mid_label: "Half Structured",
    },
    {
      format: "slider7" as const,
      lane_slug: "deep",
      prompt: "When making huge life decisions, what guides you?",
      left_label: "Cold Analytical Logic",
      right_label: "Raw Intuitive Gut Feeling",
      mid_label: "Calculated Instinct",
    },
    {
      format: "slider7" as const,
      lane_slug: "movies",
      prompt: "Your preferred ending tone in cinema:",
      left_label: "Sunlit Triumphant Resolution",
      right_label: "Ambiguous Heartbreaking Tragedy",
      mid_label: "Bittersweet",
    },
    {
      format: "slider7" as const,
      lane_slug: "gaming",
      prompt: "Your gameplay pacing preference:",
      left_label: "Meditative Chill Explorer",
      right_label: "Heart-Pounding Adrenaline Rusher",
      mid_label: "Adaptive Tempo",
    },
    {
      format: "slider7" as const,
      lane_slug: "situations",
      prompt: "Handling sudden unexpected weekend plan changes:",
      left_label: "Quietly Relieved to Stay Home",
      right_label: "Eager to Pivot to New Chaos",
      mid_label: "Go with the Flow",
    },
    {
      format: "slider7" as const,
      lane_slug: "memes",
      prompt: "Your internet humor taste spectrum:",
      left_label: "Wholesome Relatable Humor",
      right_label: "Absurdist Post-Irony",
      mid_label: "Self-Deprecating",
    },
    {
      format: "slider7" as const,
      lane_slug: "music",
      prompt: "Listening to music albums:",
      left_label: "Strict Front-to-Back Concept Order",
      right_label: "Chaotic Infinite Shuffle",
      mid_label: "Curated Playlists",
    },
    {
      format: "slider7" as const,
      lane_slug: "everyday",
      prompt: "Packing for a 4-day weekend trip:",
      left_label: "Ultralight Minimalist Backpack",
      right_label: "Packed for Every Possible Scenario",
      mid_label: "Comfortable Carry-On",
    },
    {
      format: "slider7" as const,
      lane_slug: "work",
      prompt: "Messaging preference for professional queries:",
      left_label: "Async Written Thread with Context",
      right_label: "Quick 2-Minute Voice / Huddle Call",
      mid_label: "Ping First, Call if Needed",
    },
    {
      format: "slider7" as const,
      lane_slug: "deep",
      prompt: "Your outlook on the technological future of humanity:",
      left_label: "Guarded Skepticism",
      right_label: "Audacious Techno-Optimism",
      mid_label: "Vigilant Hope",
    },
  ],

  scene: [
    {
      format: "scene" as const,
      lane_slug: "situations",
      prompt: "You spot someone across the room wearing the EXACT same peculiar outfit as you. What is your instant reaction?",
      scene_asset_key: "island-torch",
      cards: [
        { label: "The Silent Finger Gun Salute", value: "finger_guns", caption: "Lock eyes, node slowly, fire mutual finger guns." },
        { label: "The Discreet Retreat", value: "discreet_retreat", caption: "Slip into the hallway and put on your jacket forever." },
        { label: "Immediate Selfie Besties", value: "selfie_besties", caption: "March over, take an iconic twin picture immediately." },
        { label: "Pretend You Haven't Noticed", value: "play_blind", caption: "Focus with intense discipline on a random wall tile." },
      ],
    },
    {
      format: "scene" as const,
      lane_slug: "situations",
      prompt: "Your phone battery drops from 2% to 1% right as you call a cab home at midnight:",
      scene_asset_key: "path-neon",
      cards: [
        { label: "Panic Screen Brightness Sprint", value: "panic_brightness", caption: "Dim to zero, kill all apps, sprint toward the headlights." },
        { label: "Accept Your Urban Fate", value: "accept_fate", caption: "Sigh, pocket the dead brick, find a chai shop to wait." },
        { label: "Memorize License Plate in 3 Seconds", value: "memorize_plate", caption: "Recite the 4 digits like a spy operative until it arrives." },
        { label: "Borrow Strangers Power Bank", value: "borrow_bank", caption: "Activate maximum extroversion and ask a bystander for a cable." },
      ],
    },
    {
      format: "scene" as const,
      lane_slug: "situations",
      prompt: "The elevator doors open and you catch your company CEO violently dancing alone to pop music:",
      scene_asset_key: "weekend-cinema",
      cards: [
        { label: "Join the Dance Without Hesitation", value: "join_dance", caption: "Immediate groove sync. No eye contact, pure rhythm." },
        { label: "The Slow Awkward Moonwalk Backward", value: "moonwalk_away", caption: "Back away slowly into the lobby shadows." },
        { label: "Step In and Act Completely Oblivious", value: "act_oblivious", caption: "Enter calmly, face the doors, stare intently at floor numbers." },
        { label: "Give an Enthusiastic Round of Applause", value: "applause", caption: "Cheer 'Great form, 10/10' and ask what song it was." },
      ],
    },
    {
      format: "scene" as const,
      lane_slug: "situations",
      prompt: "Friday evening at 7:30 PM: Your group chat friend announces plans are canceled due to fatigue:",
      scene_asset_key: "weekend-nap",
      cards: [
        { label: "Silent Unrestrained Joy", value: "pure_joy", caption: "Drop immediately into sweatpants with blissful peace." },
        { label: "The Polite 'Oh No! Get Rest' Text", value: "polite_text", caption: "Send the sad face emoji while happily heating leftovers." },
        { label: "Mild Defeat but Relief Wins", value: "mixed_relief", caption: "You had a nice outfit ready, but bed is undefeated." },
        { label: "Reroute to a Solo Movie Adventure", value: "solo_reroute", caption: "You're already outside; you're doing a solo mission." },
      ],
    },
    {
      format: "scene" as const,
      lane_slug: "situations",
      prompt: "You accidentally sent a candid meme into the official company-wide announcement channel:",
      scene_asset_key: "island-notebook",
      cards: [
        { label: "The Tactical Delete & Pray", value: "delete_pray", caption: "Smash delete in 0.8 seconds and pretend it was a glitch." },
        { label: "Double Down and Own It", value: "double_down", caption: "Reply with 'Hope this sets the tone for Q4 productivity'." },
        { label: "Fake a Sudden Keyboard Malfunction", value: "blame_cat", caption: "Post 'Cat stepped on keyboard, apologies everyone'." },
        { label: "Close Laptop and Walk Away", value: "walk_away", caption: "Go for a very long walk in the fresh evening air." },
      ],
    },
    {
      format: "scene" as const,
      lane_slug: "food",
      prompt: "The waiter accidentally brings you an exquisite dish you didn't order, but it smells heavenly:",
      scene_asset_key: "weekend-streetfood",
      cards: [
        { label: "Honest Correction Right Away", value: "honest_correction", caption: "Politely point out the mix-up before touching it." },
        { label: "Embrace Serendipity and Eat It", value: "eat_it", caption: "The universe sent this. You will gladly pay the difference." },
        { label: "Hesitate for 3 Full Minutes", value: "hesitate", caption: "Debate the moral philosophy of accidental pasta." },
        { label: "Ask if You Can Keep Both", value: "keep_both", caption: "Negotiate a diplomatic solution for double dinner." },
      ],
    },
    {
      format: "scene" as const,
      lane_slug: "everyday",
      prompt: "A sudden cloudburst of heavy warm rain starts while you're 5 minutes away from home:",
      scene_asset_key: "path-chai",
      cards: [
        { label: "Sprint Like an Olympic Athlete", value: "sprint_home", caption: "Tuck head down, leap across puddles with athletic vigor." },
        { label: "Give Up and Stroll Peacefully", value: "peaceful_stroll", caption: "You're already wet. Might as well enjoy the petrichor." },
        { label: "Take Shelter Under the Nearest Awning", value: "awning_shelter", caption: "Stand with three other strangers watching the rain fall." },
        { label: "Hail an Auto / Taxi for 200 Meters", value: "short_cab", caption: "Dignity preserved at all economic costs." },
      ],
    },
    {
      format: "scene" as const,
      lane_slug: "gaming",
      prompt: "After 47 failed attempts, you finally defeat an infuriating Soulslike boss:",
      scene_asset_key: "sky-starry",
      cards: [
        { label: "Silent Fist Pump of Mastery", value: "silent_fist_pump", caption: "Breathe out, drop the controller, stare at the victory banner." },
        { label: "Uncontrollable Verbal Celebration", value: "shout_celebrate", caption: "Yell at the monitor like you just won the World Cup." },
        { label: "Instant Clip & Send to the Group Chat", value: "clip_send", caption: "Proof is mandatory. Post the replay immediately." },
        { label: "Turn off Console and Lie on Floor", value: "lie_on_floor", caption: "The emotional adrenaline dump demands horizontal rest." },
      ],
    },
    {
      format: "scene" as const,
      lane_slug: "everyday",
      prompt: "You reach deep into your winter jacket pocket and discover a crisp ₹500 banknote:",
      scene_asset_key: "market-sweets",
      cards: [
        { label: "Treat Past Self as a Generous Deity", value: "past_self_hero", caption: "Silently thank the past version of you for this blessing." },
        { label: "Immediate Spontaneous Treat Fund", value: "instant_treat", caption: "This money is legally free; spend it on pastries today." },
        { label: "Tuck it Back for Future Self", value: "leave_it", caption: "The perpetual jacket money cycle continues forever." },
        { label: "Show Everyone Nearby in Disbelief", value: "show_nearby", caption: "Wave the note to anyone in earshot with glee." },
      ],
    },
    {
      format: "scene" as const,
      lane_slug: "memes",
      prompt: "The WiFi router suddenly blinks red right during the dramatic climax of an intense series finale:",
      scene_asset_key: "island-torch",
      cards: [
        { label: "The Aggressive Router Stare", value: "router_stare", caption: "Glower at the blinking light hoping it feels your wrath." },
        { label: "The Ten-Second Power Cycle Ritual", value: "power_cycle", caption: "Pull the plug, count to 10 out loud with mystic precision." },
        { label: "Instant 5G Hotspot Sacrifice", value: "hotspot_sacrifice", caption: "Burn mobile data without a shred of hesitation." },
        { label: "Guess the Ending Yourself", value: "guess_ending", caption: "Create your own headcanon finale and go to sleep." },
      ],
    },
    {
      format: "scene" as const,
      lane_slug: "music",
      prompt: "A song plays on random shuffle that matches the exact emotional weather of your current moment:",
      scene_asset_key: "sky-starry",
      cards: [
        { label: "Look Out the Window Like Main Character", value: "main_character", caption: "Stare wistfully into the middle distance as music swells." },
        { label: "Hit Repeat for the Next 45 Minutes", value: "hit_repeat", caption: "Extract every drop of dopamine until the magic fades." },
        { label: "Text the Artist or Add to Top Playlist", value: "save_playlist", caption: "Pin this memory to your permanent sound library." },
        { label: "Close Eyes and Immerse Completely", value: "close_eyes", caption: "Nothing else in the universe exists for 3 minutes." },
      ],
    },
    {
      format: "scene" as const,
      lane_slug: "everyday",
      prompt: "Slipping into bed after a brutally long day, into freshly washed, crisp, cool bedsheets:",
      scene_asset_key: "weekend-nap",
      cards: [
        { label: "The Deep Involuntary Contented Sigh", value: "deep_sigh", caption: "Every tense muscle in your back surrenders at once." },
        { label: "The Leg Flutter of Pure Comfort", value: "leg_flutter", caption: "Subconsciously test the softness against both ankles." },
        { label: "Sleep in Under 60 Seconds", value: "instant_sleep", caption: "Consciousness fades into the mattress instantly." },
        { label: "Lingering in Warm Gratitude", value: "warm_gratitude", caption: "Lie awake smiling just enjoying how cozy life is right now." },
      ],
    },
  ],
};

