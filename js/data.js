// All the flavour: parody names, customers, trains, jokes.
// Every celebrity name (n) is deliberately misspelled. That is the trap:
// muscle memory types the real one and the ID check fails. The real spelling (r)
// only ever appears as the "helpful" autocorrect suggestion, which is wrong.

export const CELEBS = [
  { n: "Shah Rukh Gone", r: "Shah Rukh Khan", g: "M" },
  { n: "Salmon Khan", r: "Salman Khan", g: "M" },
  { n: "Aamir Khaana", r: "Aamir Khan", g: "M" },
  { n: "Amitabh Bachaao", r: "Amitabh Bachchan", g: "M" },
  { n: "Ranbir Kaput", r: "Ranbir Kapoor", g: "M" },
  { n: "Ranveer Singalong", r: "Ranveer Singh", g: "M" },
  { n: "Akshay Kamaal", r: "Akshay Kumar", g: "M" },
  { n: "Hrithik Roshandaan", r: "Hrithik Roshan", g: "M" },
  { n: "Ajay Devgun", r: "Ajay Devgn", g: "M" },
  { n: "Sunny Dhai Kilo", r: "Sunny Deol", g: "M" },
  { n: "Tiger Shrug", r: "Tiger Shroff", g: "M" },
  { n: "Vicky Kushal", r: "Vicky Kaushal", g: "M" },
  { n: "Nawaz Din Bhar", r: "Nawazuddin Siddiqui", g: "M" },
  { n: "Anil Jhakaas", r: "Anil Kapoor", g: "M" },
  { n: "Jackie Bhidu", r: "Jackie Shroff", g: "M" },
  { n: "Govinda Aala", r: "Govinda", g: "M" },
  { n: "Rajni Cant", r: "Rajinikanth", g: "M" },
  { n: "Kapil Sharmaya", r: "Kapil Sharma", g: "M" },
  { n: "Arijit Sing", r: "Arijit Singh", g: "M" },
  { n: "Yo Yo Funny Singh", r: "Yo Yo Honey Singh", g: "M" },
  { n: "Diljit Dosa", r: "Diljit Dosanjh", g: "M" },
  { n: "Virat Kholi", r: "Virat Kohli", g: "M" },
  { n: "Rohit Sharmaji", r: "Rohit Sharma", g: "M" },
  { n: "MS Dhobi", r: "MS Dhoni", g: "M" },
  { n: "Sachin Tandoorkar", r: "Sachin Tendulkar", g: "M" },
  { n: "Jasprit Boomboom", r: "Jasprit Bumrah", g: "M" },
  { n: "Hardik Panda", r: "Hardik Pandya", g: "M" },
  { n: "Shikhar Dhaba", r: "Shikhar Dhawan", g: "M" },
  { n: "KL Rahu Ketu", r: "KL Rahul", g: "M" },
  { n: "Ravindra Jaaduja", r: "Ravindra Jadeja", g: "M" },
  { n: "Rishabh Pant Shirt", r: "Rishabh Pant", g: "M" },
  { n: "Sourav Dadagiri", r: "Sourav Ganguly", g: "M" },
  { n: "Rahul Deewar", r: "Rahul Dravid", g: "M" },
  { n: "Neeraj Bhala", r: "Neeraj Chopra", g: "M" },
  { n: "Elaichi Musk", r: "Elon Musk", g: "M" },
  { n: "Bill Gateway", r: "Bill Gates", g: "M" },
  { n: "Mark Zukerbhaiya", r: "Mark Zuckerberg", g: "M" },
  { n: "Jeff Bazaar", r: "Jeff Bezos", g: "M" },
  { n: "Ed Sheera", r: "Ed Sheeran", g: "M" },
  { n: "Justin Babar", r: "Justin Bieber", g: "M" },
  { n: "Cristiano Ronaldosa", r: "Cristiano Ronaldo", g: "M" },
  { n: "Lionel Messy", r: "Lionel Messi", g: "M" },
  { n: "Tom Crooze", r: "Tom Cruise", g: "M" },
  { n: "Leonardo Di Chapati", r: "Leonardo DiCaprio", g: "M" },
  { n: "Bread Pitt", r: "Brad Pitt", g: "M" },
  { n: "Johnny Dip", r: "Johnny Depp", g: "M" },
  { n: "Keanu Leaves", r: "Keanu Reeves", g: "M" },
  { n: "Vin Petrol", r: "Vin Diesel", g: "M" },
  { n: "Deepika Padukaun", r: "Deepika Padukone", g: "F" },
  { n: "Alia Bhatti", r: "Alia Bhatt", g: "F" },
  { n: "Katrina Cafe", r: "Katrina Kaif", g: "F" },
  { n: "Priyanka Chopsticks", r: "Priyanka Chopra", g: "F" },
  { n: "Kareena Kapurthala", r: "Kareena Kapoor", g: "F" },
  { n: "Anushka Sharbat", r: "Anushka Sharma", g: "F" },
  { n: "Kiara Adrakvani", r: "Kiara Advani", g: "F" },
  { n: "Madhuri Fixit", r: "Madhuri Dixit", g: "F" },
  { n: "Kajol Kaajal", r: "Kajol", g: "F" },
  { n: "Aishwarya Raita", r: "Aishwarya Rai", g: "F" },
  { n: "Sushmita Sensex", r: "Sushmita Sen", g: "F" },
  { n: "Rashmika Mandi", r: "Rashmika Mandanna", g: "F" },
  { n: "Taapsee Paneer", r: "Taapsee Pannu", g: "F" },
  { n: "Vidya Balance", r: "Vidya Balan", g: "F" },
  { n: "Neha Cooker", r: "Neha Kakkar", g: "F" },
  { n: "Shreya Ghoshna", r: "Shreya Ghoshal", g: "F" },
  { n: "Sunidhi Chowmein", r: "Sunidhi Chauhan", g: "F" },
  { n: "Tailor Swift", r: "Taylor Swift", g: "F" },
  { n: "Selena Golgappa", r: "Selena Gomez", g: "F" },
  { n: "Rihanna Bahana", r: "Rihanna", g: "F" },
  { n: "Beyonsay", r: "Beyonce", g: "F" },
  { n: "Kim Kadhai", r: "Kim Kardashian", g: "F" },
  { n: "Mithai Raj", r: "Mithali Raj", g: "F" },
  { n: "Sania Mirchi", r: "Sania Mirza", g: "F" },
  // meme creators and internet people (m: true lets the generator make sure they show up)
  { n: "Puneet Supperstar", r: "Puneet Superstar", g: "M", m: true },
  { n: "Deepak Kulhad", r: "Deepak Kalal", g: "M", m: true },
  { n: "Samay Rainy", r: "Samay Raina", g: "M", m: true },
  { n: "Tanmay Bhatura", r: "Tanmay Bhat", g: "M", m: true },
  { n: "Chunaid Khan", r: "Junaid Khan", g: "M", m: true },
  { n: "Curry Minati", r: "CarryMinati", g: "M", m: true },
  { n: "Bhuvan Balm", r: "Bhuvan Bam", g: "M", m: true },
  { n: "Ashish Chanachaat", r: "Ashish Chanchlani", g: "M", m: true },
  { n: "Harsh Baniyanwal", r: "Harsh Beniwal", g: "M", m: true },
  { n: "Dolly Coffeewala", r: "Dolly Chaiwala", g: "M", m: true },
  { n: "Sorry Orry", r: "Orry", g: "M", m: true },
  { n: "Chai Biceps", r: "BeerBiceps", g: "M", m: true },
  { n: "Zakir Sakht Khan", r: "Zakir Khan", g: "M", m: true },
  { n: "Tatkal Guruji", r: "Technical Guruji", g: "M", m: true },
  { n: "Mr Feast", r: "MrBeast", g: "M", m: true },
  { n: "Tired Insaan", r: "Triggered Insaan", g: "M", m: true },
  { n: "Fakira Insaan", r: "Fukra Insaan", g: "M", m: true },
  { n: "Flying Biscuit", r: "Flying Beast", g: "M", m: true },
  { n: "Sourav Josh", r: "Sourav Joshi", g: "M", m: true },
  { n: "Ashneer Grocer", r: "Ashneer Grover", g: "M", m: true },
  { n: "Thugesh Thandai", r: "Thugesh", g: "M", m: true },
  { n: "Kusha Kapalbhati", r: "Kusha Kapila", g: "F", m: true },
  { n: "Prajakta Koliflower", r: "Prajakta Koli", g: "F", m: true },
  { n: "Rakhi Saawan", r: "Rakhi Sawant", g: "F", m: true },
  { n: "Dhinchak Poha", r: "Dhinchak Pooja", g: "F", m: true },
  { n: "Sima Tapri", r: "Sima Taparia", g: "F", m: true },
  { n: "Shehnaaz Grill", r: "Shehnaaz Gill", g: "F", m: true },
  { n: "Bharti Sings", r: "Bharti Singh", g: "F", m: true },
  { n: "Rebel Kaddu", r: "Rebel Kid", g: "F", m: true },
];

export const TODDLERS = [
  { n: "Chintu", g: "M" },
  { n: "Golu", g: "M" },
  { n: "Bittu", g: "M" },
  { n: "Guddu", g: "M" },
  { n: "Pinky", g: "F" },
  { n: "Munni", g: "F" },
  { n: "Gudiya", g: "F" },
  { n: "Chutki", g: "F" },
  { n: "Binod", g: "M" },
];

export const PERSONAS = [
  { who: "Bua ji", av: "👵", intro: n => `Beta, tu toh computer wala hai na. ${n} Tatkal kara de.`, outro: "Jaldi karna, 10 baje khulta hai." },
  { who: "Sharma ji (padosi)", av: "🧓", intro: n => `Beta, Tatkal khulne wala hai. Jaldi se ${n} nikal do.`, outro: "Mere bete ne toh pichli baar 40 second mein kar diya tha." },
  { who: "Boss", av: "🧑‍💼", intro: n => `Need ${n}. Urgent. Appraisals are next week, just saying.`, outro: "Do the needful. Revert ASAP." },
  { who: "College dost", av: "🧢", intro: n => `Bhai ${n} nikal de yaar. Treat pakki, is baar sach mein.`, outro: "Tu hi hai bhai, tu hi hai." },
  { who: "Mummy", av: "👩", intro: n => `Beta khana khaya? Accha sun, ${n} book kar de.`, outro: "Aur paani peete rehna." },
  { who: "Cyber cafe customer", av: "🧔", intro: n => `Bhaiya ${n} chahiye. Jaldi. 50 rupay extra dunga.`, outro: "Agent bol raha tha 500 lagega. Aap sahi aadmi ho." },
  { who: "Door ke rishtedaar", av: "🕵️", intro: n => `Pehchana? Main tumhare papa ke mama ka ladka. ${n} chahiye.`, outro: "Shaadi mein milte hain. Tumhari." },
  { who: "Wedding planner", av: "💒", intro: n => `Baraat ke log hain. ${n} chahiye. Ek bhi WL gaya toh shaadi cancel.`, outro: "No pressure. Bas do parivaaron ki izzat hai." },
  { who: "HR", av: "📋", intro: n => `Team offsite! ${n} please. Budget is tight, enthusiasm is mandatory.`, outro: "This is a fun activity. Attendance is compulsory." },
  { who: "Landlord", av: "🏠", intro: n => `Rent baad mein dekhenge. Pehle ${n} kara do.`, outro: "Aur raat ko 10 ke baad gate band." },
  { who: "Gym bro", av: "💪", intro: n => `Bro ${n} chahiye bro. Protein le ke jaana hai competition mein.`, outro: "Light weight baby!" },
  { who: "Chachi", av: "🧕", intro: n => `Beta tum toh IT mein ho na. ${n} kara do, printer bhi theek kar dena baad mein.`, outro: "God bless. Good morning image bhej rahi hoon." },
];

export const CITIES = [
  { n: "New Delhi", r: "NDLS", a: "DEL" },
  { n: "Mumbai", r: "BCT", a: "BOM" },
  { n: "Kolkata", r: "HWH", a: "CCU" },
  { n: "Chennai", r: "MAS", a: "MAA" },
  { n: "Bengaluru", r: "SBC", a: "BLR" },
  { n: "Lucknow", r: "LKO", a: "LKO" },
  { n: "Patna", r: "PNBE", a: "PAT" },
  { n: "Jaipur", r: "JP", a: "JAI" },
  { n: "Ahmedabad", r: "ADI", a: "AMD" },
  { n: "Bhopal", r: "BPL", a: "BHO" },
  { n: "Varanasi", r: "BSB", a: "VNS" },
  { n: "Pune", r: "PUNE", a: "PNQ" },
  { n: "Hyderabad", r: "HYB", a: "HYD" },
  { n: "Kanpur", r: "CNB", a: "KNU" },
  { n: "Guwahati", r: "GHY", a: "GAU" },
  { n: "Goa", r: "MAO", a: "GOI" },
];

export const TRAIN_NAMES = [
  "Humsuffer Express",
  "Late-dhani Express",
  "Garib Wrath",
  "Der-onto Express",
  "Vande Wait",
  "Tez As If Express",
  "Shatab-Der Express",
  "Sampark Toot Gaya Kranti",
  "Gati Kam Express",
  "Chai Garam Mail",
  "Kumbhkaran Superfast",
  "Agle Janam Passenger",
  "Intezaar Intercity",
  "Kal Aana Express",
  "Thoda Adjust Mail",
  "Chain Pulling Special",
  "Upper Berth Superfast",
  "Bhaag Yatri Bhaag Express",
  "Platform Badal Gaya Mail",
  "Pantry Band Hai Express",
];

export const AIRLINES = [
  { n: "Air Jugaad", c: "AJ" },
  { n: "IndiGone", c: "6G" },
  { n: "Spicy Jet Lag", c: "SJ" },
  { n: "Go Late", c: "GL" },
  { n: "Akaash Mein Atka", c: "AA" },
];

export const CLASS_LABEL = {
  SL: "Sleeper",
  "3A": "AC 3 Tier",
  "2A": "AC 2 Tier",
  CC: "AC Chair Car",
  "2S": "Second Sitting",
  EC: "Exec Chair",
  ECO: "Economy",
};

export const ADDONS_RAIL = [
  { id: "ins", label: "Travel insurance", price: 1, ask: "Aur haan, travel insurance zaroor le lena. 45 paise ka hi toh hai." },
  { id: "meal", label: "Veg meal (paneer, probably)", price: 180, ask: "Khana bhi add kar dena, veg meal." },
  { id: "bed", label: "Bedroll kit", price: 60, ask: "Bedroll add kar dena, chaadar ghar se nahi laa rahe." },
  { id: "don", label: "Donate to Rail Vikas Nidhi", price: 10 },
  { id: "upg", label: "Auto upgrade (to a worse seat)", price: 0 },
];

export const ADDONS_AIR = [
  { id: "prot", label: "Trip protection", price: 399 },
  { id: "bag", label: "Extra baggage 5 kg", price: 900, ask: "Extra baggage 5 kg add kar dena, achaar ke dabbe hain." },
  { id: "meal", label: "Meal combo (sandwich, regret)", price: 350, ask: "Flight mein khana add kar dena." },
  { id: "pri", label: "Priority boarding", price: 450 },
  { id: "co2", label: "Carbon offset", price: 99 },
];

export const NEED_TEXT = {
  LOWER_HARD: ["Ghutne ka problem hai, LOWER berth hi chahiye.", "Upar nahi chadh sakte. Lower berth compulsory.", "Doctor ne mana kiya hai chadhne se. Lower only."],
  AISLE_HARD: ["Baar baar uthna padta hai, AISLE seat hi chahiye.", "Ghutne seedhe karne hain, aisle seat compulsory."],
  LOWER: ["Lower berth pasand hai.", "Neeche wali berth de dena."],
  UB: ["Upper berth chahiye, koi disturb na kare.", "Upar wali berth. Sona hai bas."],
  MB: ["Middle berth chahiye. Haan sach mein. Mat poochh.", "Middle berth, lucky hai inke liye."],
  SU: ["Side upper chahiye, privacy ke liye.", "Side upper de dena."],
  PWR: ["Phone 2% pe hai. CHARGING point (⚡) wali seat chahiye.", "Laptop pe kaam karna hai, charging point (⚡) wali seat."],
  W: ["Window seat chahiye, reel banani hai.", "Khidki wali seat."],
  A: ["Aisle seat pasand hai.", "Aisle seat, pair failane hain."],
  XL: ["6 foot 4 hai. Extra legroom (XL) row chahiye.", "Lamba aadmi hai, XL legroom wali row."],
};

export const FEUD_TEXT = [
  (a, b) => `Aur sun, ${a} aur ${b} ki ladai chal rahi hai. Dono ko ALAG ##UNIT## mein bithana.`,
  (a, b) => `${a} aur ${b} baat nahi kar rahe (property ka matter hai). Same ##UNIT## mein mat dalna.`,
  (a, b) => `${a} ne ${b} ko shaadi mein nahi bulaya tha. Alag ##UNIT## please.`,
];

export const COUPLE_TEXT_RAIL = [
  (a, b) => `${a} aur ${b} newly married hain. Unko SIDE LOWER + SIDE UPPER ek hi bay mein dena.`,
  (a, b) => `${a} aur ${b} ko side wali dono berth (SL + SU, same bay) chahiye. Pyaar hai.`,
];
export const COUPLE_TEXT_SEAT = [
  (a, b) => `${a} aur ${b} ko BAGAL BAGAL ki seat dena (beech mein aisle nahi).`,
  (a, b) => `${a} aur ${b} couple hain. Adjacent seats, same side.`,
];

export const NO_ADDON_TEXT = [
  "Koi extra cheez mat add karna. Paise ped pe nahi ugte.",
  "Add-on kuch nahi chahiye. Sab untick kar dena.",
];

export const REACT = {
  great: [
    "Arre wah! Tu toh agent nikla. 🙏",
    "Confirm ho gaya?! Beta tu genius hai.",
    "Mithai ka dabba bhej raha hoon.",
    "Rishta bhejun tere liye? Itna talented ladka.",
    "10/10. Railway ko tujhe hire karna chahiye.",
  ],
  ok: [
    "Theek hai. Chalega. Adjust kar lenge.",
    "Hmm. Ho toh gaya. Bas.",
    "Thoda aur dhyan deta toh accha hota.",
    "Chalo, WL se toh accha hai.",
  ],
  bad: [
    "Ye kya kiya tune?! Ghar aa, baat karte hain.",
    "Isse accha toh agent ko 500 de deta.",
    "Sharma ji ke bete ne kabhi aisa nahi kiya.",
    "Poora safar khade khade jayenge kya?",
  ],
};

export const TICKER = [
  "Beware of touts. We are the only authorised source of disappointment.",
  "Server load: 98%. The other 2% is also you.",
  "Chart preparation status: emotionally unprepared.",
  "Tatkal opens at 10:00:00. Closes at 10:00:03.",
  "Your call is important to us. Please hold until retirement.",
  "New: WL tickets now come with a free motivational quote.",
  "Do not press back or refresh. Do not breathe either.",
  "Train 12345 is running late by 1 financial year.",
  "Forgot password? So did we.",
  "RailJhatka is a parody. No real trains were booked in the making of this game.",
];

export const PAY_FAILS = [
  "Bank server is on lunch break.",
  "Transaction failed successfully.",
  "Amount maybe debited. Refund in 5 to 7 working years.",
  "Your bank says: abhi nahi, baad mein aana.",
  "Payment gateway ne seen karke chhod diya.",
  "Error 420: Paisa gaya, ticket nahi aaya. Just kidding. Retry.",
  "OTP was correct. Vibes were not.",
];

export const WL_JOKES = [
  "WL 47. Chart will prepare. You will not.",
  "Waiting list. Customer wants a seat, not hope.",
  "WL means Waise Labh nahi.",
];
export const RAC_JOKES = ["RAC: aadhi seat, poora kiraya. Customer wants confirmed."];
export const REGRET_JOKES = ["REGRET. The train regrets. You regret. Everyone regrets.", "Sold out. Try a different one."];

export const SPAM = [
  { from: "Mummy", text: "Beta khana khaya?" },
  { from: "LoanWala", text: "Pre-approved loan of ₹5,00,000! No documents, only regrets." },
  { from: "Boss", text: "Quick call?" },
  { from: "JhatkaPay", text: "You won a scratch card worth ₹2!" },
  { from: "Family Group", text: "Good morning 🌹🌹 (47 new images)" },
  { from: "Sim Card Co.", text: "Your plan expires today. Recharge with 299." },
  { from: "Pizza Jhatka", text: "BUY 1 GET 1. Only today. And every day." },
];

export const TITLES = [
  { min: 0, t: "Waitlisted Forever" },
  { min: 80, t: "Cyber Cafe Trainee" },
  { min: 220, t: "Mohalla Booking Bhaiya" },
  { min: 420, t: "Authorised Agent" },
  { min: 750, t: "Tatkal Ninja" },
  { min: 1200, t: "Tatkal Devta" },
];

export const VIP_PERSONA = {
  who: "Mantri ji ka PA", av: "🕴️",
  intro: n => `Mantri ji ke khaas log hain. ${n} chahiye. Abhi.`,
  outro: "Galti hui toh transfer pakka. Tumhara.",
};

export const BOSS_PERSONA = {
  who: "Baraat in-charge", av: "🤵",
  intro: n => `FINAL CALL! Poori baraat platform pe khadi hai. ${n} chahiye, ek bhi WL gaya toh dulha nahi jayega.`,
  outro: "Band baaja ready hai. Bas tickets ka wait hai.",
};

export const WC_TEXT = [
  "Aur haan, TOILET ke paas wali ##UNIT## bilkul nahi (🚽 wali). Badbu aati hai.",
  "Toilet ke bagal wali ##UNIT## mat dena (🚽 wali). Raat bhar darwaza bajta hai.",
];

export const NAGS = {
  half: ["Hua kya?", "Beta kitna time lagega?", "Hello? Ticket?", "Update?", "Net slow hai kya tumhara?"],
  late: ["Sharma ji ka beta hota toh ab tak ho gaya hota.", "Main agent ko phone laga raha hoon...", "Last warning. Jaldi karo.", "Tatkal hai, Tatkal! Tat-KAL nahi!"],
  gone: ["Rehne do. Agent se kara liya. 500 extra gaye, tumhari wajah se.", "Chhodo. Bus se chale jayenge.", "Tumse na ho payega. Bye."],
};

export const TERMS = [
  "1. By booking you agree that the train may or may not exist.",
  "2. Arrival times are aspirational.",
  "3. WL stands for Whatever, Later.",
  "4. The chart will be prepared when it feels ready.",
  "5. Refunds are processed within 5 to 7 working generations.",
  "6. Side lower passengers must surrender half their berth to strangers with confidence.",
  "7. The pantry car reserves the right to serve yesterday.",
  "8. Charging points are decorative.",
  "9. Blankets have been washed. We will not say when.",
  "10. Chain pulling for a forgotten tiffin is frowned upon but understood.",
  "11. You will share your food. This is not optional.",
  "12. Uncle on the middle berth will sleep at 8 pm. Plan accordingly.",
  "13. By scrolling this far you have shown more patience than our servers.",
  "14. You agree to everything. You always do.",
];

export const TIPS = {
  search: "Read the chat, then tap the green AVL chip on the train that fits what they asked for. Only one train is right.",
  pax: "Type each passenger exactly as the chat spells them. Ignore autocorrect: it thinks it knows better.",
  seats: "Tap a passenger, then a free seat. Keep families in one bay, give people what they asked for, and hurry: seats get taken.",
  review: "Untick every add-on the customer did not ask for, then solve the captcha.",
  pay: "Pick the gateway with the best success rate. If it fails, just try again.",
};
