const CHARACTER = "the Counter Notes illustrated host from Character.png: a friendly man in his early 30s, short black hair, trimmed beard, crisp black outlines, flat cartoon color with light shading, dark slate t-shirt, dark pants, white sneakers, black watch, brown clipboard in one hand and a yellow price tag in the other. Illustrated cartoon, not a photograph and not a stick figure.";

const CHANNEL_DESC = `Counter Notes breaks down the real stories behind everyday brands, restaurants, retail stores, and consumer products.

From fast-food price wars and supermarket psychology to why a giant chain closes stores while a quieter rival takes the corner, every video uses clean timelines, simple price comparisons, and clear charts.

New business and brand breakdowns land 3 to 5 times a week. Subscribe so you catch the next one.`;

const CHANNEL_TAGS = "Counter Notes, brand stories, business history, why brands fail, retail collapse, fast food wars, company rise and fall, business strategy explained, consumer psychology, everyday economics";

const VIDEOS = [
  { id: 1, short: "Subway", tier: "High", length: "9 min", title: "Why Subway Went From 44,000 Stores to Closing Thousands", summary: "How a rush to open stores, the end of the $5 footlong, and stronger sandwich rivals squeezed franchisee profits.", keywords: "why subway is failing, subway decline explained, fast food business stories, subway franchise, brand downfall", angle: "Subway passed 44,000 locations, the $5 footlong stopped working for owners, and rival sandwich shops took the lunch crowd.", claim: "Store count near 44,000 and the $5 footlong economics for franchisees.", thumb: "WHY SUBWAY COLLAPSED", scene: "a falling store-count chart and a crossed-out $5 price tag", rival: "newer sandwich chains" },
  { id: 2, short: "Dollar Tree", tier: "High", length: "8 min", title: "How Dollar Tree Broke Its Own $1 Promise (And What Happened Next)", summary: "Why Dollar Tree left a 35-year $1 cap, how shoppers reacted, and what the hike said about discount retail.", keywords: "dollar tree price increase, why dollar tree raised prices, retail business breakdown, dollar store economics", angle: "The math behind ending the $1 price after 35 years, the traffic shift, and the Family Dollar margin problem.", claim: "The move from $1 to $1.25 after roughly 35 years at $1.", thumb: "THE $1 LIE", scene: "a torn $1.00 sticker with $1.25 showing underneath", rival: "other dollar stores and Family Dollar" },
  { id: 3, short: "Pizza Hut", tier: "High", length: "9 min", title: "Why Pizza Hut Lost the Delivery War to Domino's", summary: "Pizza Hut carried sit-down restaurants while Domino's rebuilt around delivery speed and a digital tracker.", keywords: "pizza hut vs dominos, why pizza hut is dying, dominos turnaround story, fast food rivalry", angle: "Pizza Hut owned dine-in pizza in the 1990s. Domino's passed it by betting on delivery speed and ordering tech.", claim: "The flip in store strategy and delivery share between Pizza Hut and Domino's.", thumb: "HOW DOMINO'S WON", scene: "two pizza boxes and a stopwatch on a simple two-line chart", rival: "Domino's" },
  { id: 4, short: "Costco", tier: "High", length: "7 min", title: "The Real Reason Costco Never Raises Its $1.50 Hot Dog Price", summary: "The loss-leader math, in-house meat supply, and membership fees behind the $1.50 combo.", keywords: "costco hot dog economics, why costco hot dog is 1.50, costco business model, loss leader strategy", angle: "Costco has held the hot dog and soda at $1.50 since 1985 by owning more of the supply chain and earning billions from membership fees.", claim: "The $1.50 hot dog and soda price holding since 1985.", thumb: "STILL $1.50?!", scene: "a $1.50 sign shielded from rising price arrows", rival: "warehouse clubs that raise food-court prices" },
  { id: 5, short: "Crocs", tier: "High", length: "8 min", title: "How Crocs Went From a Worldwide Joke to a $4 Billion Brand", summary: "The post-2008 crash, factory cuts, and the charm-and-scarcity comeback that rebuilt Crocs.", keywords: "how crocs made a comeback, crocs business turnaround, fashion brand revival, consumer brand story", angle: "Crocs expanded too fast around 2007, closed factories, then used limited drops and Jibbitz charms to reach about $4 billion.", claim: "The near-collapse after 2007 and the later climb toward a $4 billion brand.", thumb: "$4 BILLION COMEBACK", scene: "a V-shaped chart from a deep dip to a high peak", rival: "casual footwear brands that stayed seasonal" },
  { id: 6, short: "Toys R Us", tier: "High", length: "10 min", title: "Why Toys R Us Really Went Bankrupt (It Wasn't Just Amazon)", summary: "A $5 billion buyout left the toy chain short of cash for stores and a real website.", keywords: "why toys r us went bankrupt, toys r us downfall, retail apocalypse, leveraged buyout business", angle: "A weak early Amazon deal and about $5 billion of buyout debt starved the stores of cash.", claim: "About $5 billion of buyout debt and the early website deal.", thumb: "WHO KILLED TOYS R US?", scene: "a heavy $5B block pressing on a toy-store icon", rival: "Amazon and specialty toy sellers" },
  { id: 7, short: "Starbucks", tier: "High", length: "8 min", title: "Why Starbucks Failed Miserably in Australia", summary: "Starbucks opened 87 Australian stores too fast and lost more than $100 million before pulling back.", keywords: "why starbucks failed in australia, international business fails, starbucks business strategy, coffee shop rivalry", angle: "Locals already had independent espresso cafes. Starbucks closed most of its 87 stores after losing more than $100 million.", claim: "87 stores opened, most later closed, and losses above $100 million.", thumb: "$100M MISTAKE", scene: "a coffee cup beside a store counter falling from 87 toward a much smaller number", rival: "independent Australian cafes" },
  { id: 8, short: "Red Bull", tier: "High", length: "9 min", title: "How Red Bull Built a $10 Billion Empire Without Making a Single Drink", summary: "Outsourced canning, thick margins, and an extreme-sports media machine.", keywords: "red bull business model, how red bull makes money, marketing case study, beverage brand history", angle: "Red Bull lets partners can and ship the drink so it can spend on Formula 1, stunts, and media that sell billions of cans.", claim: "Outsourced production and a brand valued around $10 billion.", thumb: "ZERO FACTORIES?!", scene: "a slim can silhouette and a tall marketing bar next to a short production bar", rival: "soda brands that own bottling plants" },
  { id: 9, short: "Sears", tier: "High", length: "10 min", title: "Why Sears Was Once the Amazon of America, and How It Died", summary: "The catalog giant that sold houses by mail, then starved its stores and lost a 130-year lead.", keywords: "why sears went bankrupt, sears vs amazon history, retail collapse explained, famous business failures", angle: "Sears invented catalog shopping, then lost the lead by underfunding stores and fighting inside the company.", claim: "The catalog lead and the roughly 130-year collapse into bankruptcy.", thumb: "130 YEARS DESTROYED", scene: "a long timeline bar that drops while a delivery box rises", rival: "Amazon and later big-box retail" },
  { id: 10, short: "IKEA", tier: "High", length: "8 min", title: "How IKEA Tricks Your Brain Into Buying Twice as Much", summary: "The one-way path, open bins, cheap meatballs, and flat-pack math that grow the basket.", keywords: "ikea psychology tricks, how ikea makes money, retail store layout strategy, consumer psychology", angle: "A walk through the one-way path, showroom rooms, the IKEA effect, and food-court pricing.", claim: "The layout and pricing tactics that raise basket size.", thumb: "IKEA'S HIDDEN TRAP", scene: "a winding path arrow with a shopping bag that gets larger", rival: "traditional furniture showrooms" },
  { id: 11, short: "Spirit", tier: "Medium", length: "9 min", title: "Why Spirit Airlines' Ultra-Cheap Ticket Model Finally Hit a Wall", summary: "Bare fares, bag and seat fees, and the moment big airlines copied basic economy.", keywords: "why spirit airlines is failing, budget airline economics, airline business model, spirit airlines bankruptcy", angle: "Spirit sold $39 tickets and made money on fees until pilot costs rose and big airlines copied the cheap fare.", claim: "The $39 fare plus bag and seat fees, and the basic-economy squeeze.", thumb: "THE $39 TICKET TRAP", scene: "a $39 ticket surrounded by +$45 bag and +$25 seat tags", rival: "major airlines' basic economy" },
  { id: 12, short: "Chipotle", tier: "Medium", length: "8 min", title: "How Chipotle Survived a Food Safety Crisis and Tripled Its Stock", summary: "The 2015 outbreaks cut sales hard. New kitchens, digital lanes, and a tighter menu brought the brand back.", keywords: "chipotle turnaround story, chipotle food crisis, fast casual restaurant strategy, brand recovery", angle: "Chipotle lost about half its value after 2015, changed leadership, built Chipotlanes, and came back stronger.", claim: "The 2015 food-safety hit and the later recovery in sales and the stock.", thumb: "FROM CRISIS TO 3X", scene: "a split chart with a red drop on the left and a green climb on the right", rival: "other fast-casual burrito chains" },
  { id: 13, short: "Red Lobster", tier: "Medium", length: "8 min", title: "Why Red Lobster Went Bankrupt Over Endless Shrimp", summary: "A $20 endless-shrimp deal, supplier tension, and sale-leaseback rent.", keywords: "why red lobster went bankrupt, endless shrimp loss, restaurant business failures, private equity real estate", angle: "Permanent $20 Endless Shrimp lost money while high rent from sale-leaseback deals drained cash.", claim: "The $20 endless shrimp promotion and the rent from sale-leaseback deals.", thumb: "THE $20 MISTAKE", scene: "a $20 unlimited sign tipping a scale into a loss", rival: "casual dining chains with tighter promotions" },
  { id: 14, short: "Trader Joe's", tier: "Medium", length: "8 min", title: "How Trader Joe's Makes More Money Per Square Foot Than Whole Foods", summary: "Small stores, a short private-label list, and inventory that actually moves.", keywords: "trader joes business model, trader joes vs whole foods, grocery store economics, private label strategy", angle: "About 4,000 items instead of 40,000, no paid shelf fees, and higher sales per square foot than giant supermarkets.", claim: "Roughly 4,000 SKUs versus about 40,000 in a typical supermarket, and higher sales per square foot.", thumb: "SMALL STORE, BIG CASH", scene: "a small store bar beating a much larger supermarket bar", rival: "Whole Foods and full-line supermarkets" },
  { id: 15, short: "Blockbuster", tier: "Medium", length: "9 min", title: "Why Blockbuster Turned Down Buying Netflix for $50 Million", summary: "Late fees of about $800 million a year made the Netflix offer easy to laugh off, until it was late.", keywords: "blockbuster vs netflix story, why blockbuster failed, late fees business model, famous business mistakes", angle: "In 2000 Blockbuster passed on Netflix because late fees were a profit center and stores did not want to cannibalize themselves.", claim: "The roughly $50 million Netflix offer and about $800 million a year in late fees.", thumb: "WORST DEAL IN HISTORY", scene: "a $50M offer sheet with a red X beside a stack of late-fee receipts", rival: "Netflix" },
  { id: 16, short: "LEGO", tier: "Medium", length: "9 min", title: "How LEGO Nearly Went Bankrupt in 2003 and Came Back to Number 1", summary: "Too many brick shapes, theme parks, and games. Then a hard cut back to the core sets.", keywords: "how lego survived bankruptcy, lego business turnaround, toy company history, brand strategy case study", angle: "LEGO was losing about $1 million a day in 2003 with around 14,000 unique pieces, then cut the catalog and licensed stories people already loved.", claim: "About $1 million a day in losses in 2003 and a catalog near 14,000 piece types.", thumb: "1 DAY FROM BANKRUPTCY", scene: "four clean bricks stacked into a rising profit bar", rival: "video games and other toy brands" },
  { id: 17, short: "McDonald's", tier: "Medium", length: "8 min", title: "Why McDonald's Is Actually a $40 Billion Real Estate Company", summary: "The company buys the land, builds the restaurant, and collects rent from franchisees.", keywords: "mcdonalds real estate business model, how mcdonalds makes money, franchise economics, fast food finance", angle: "McDonald's buys land, builds restaurants, and leases them back to owners at a markup. Rent is the steadier profit.", claim: "Rent and real estate, not the burger margin, as the main profit engine, with a business often described around $40 billion.", thumb: "NOT A BURGER COMPANY", scene: "a building deed outweighing a burger on a balance scale", rival: "franchise chains that do not own the land" },
  { id: 18, short: "Forever 21", tier: "Medium", length: "8 min", title: "Why Forever 21 Collapsed After Being Worth $4 Billion", summary: "Huge mall leases, a slow website, and faster rivals such as Zara and Shein.", keywords: "why forever 21 failed, fast fashion business collapse, retail mall bankruptcy, forever 21 downfall", angle: "Forever 21 took giant mall boxes just as foot traffic faded and faster online rivals took younger shoppers.", claim: "A valuation around $4 billion and the later bankruptcy tied to oversized stores.", thumb: "$4B TO BANKRUPT", scene: "a crash line from $4B to zero beside an empty mall store", rival: "Zara and Shein" },
  { id: 19, short: "Aldi", tier: "Medium", length: "8 min", title: "How Aldi Sells Groceries 30% Cheaper Than Walmart", summary: "Quarter cart deposits, display boxes, private label, and a tiny crew at the register.", keywords: "how aldi keeps prices low, aldi vs walmart, discount grocery economics, supermarket strategy", angle: "Cart deposits, shelf-ready boxes, multi-sided barcodes, and about four people per store keep Aldi's prices down.", claim: "Prices about 30% under Walmart, a 25-cent cart deposit, and a very small store crew.", thumb: "30% CHEAPER", scene: "a 25-cent coin beside a receipt with a 30% slash", rival: "Walmart" },
  { id: 20, short: "Panera", tier: "Medium", length: "8 min", title: "Why Panera Bread Quietly Lost Its Loyal Customers", summary: "After a private-equity deal, portions shrank, prices rose, and regulars left.", keywords: "why panera bread is declining, panera shrinkflation, restaurant private equity, fast casual food trends", angle: "Panera moved from a neighborhood bakery-cafe toward smaller portions, higher prices, and more frozen dough.", claim: "Smaller portions and higher menu prices after the chain was taken private.", thumb: "WHAT HAPPENED TO PANERA?", scene: "a shrinking sandwich next to a $16 receipt", rival: "other fast-casual lunch chains" },
  { id: 21, short: "Zara", tier: "Starter", length: "8 min", title: "How Zara Built a Fashion Empire Without Spending Money on Ads", summary: "A two-week design-to-shelf path, small batches, and stores on expensive corners instead of ads.", keywords: "zara business model explained, fast fashion supply chain, how zara makes money, retail strategy", angle: "Zara can move a look from idea to store in about 15 days, keeps batches small, and spends on locations instead of ads.", claim: "About 15 days from design to store versus a traditional cycle of several months, with little traditional advertising.", thumb: "ZERO AD BUDGET", scene: "a 15-day stopwatch beating a 6-month calendar", rival: "brands that spend heavily on ads" },
  { id: 22, short: "Bed Bath & Beyond", tier: "Starter", length: "9 min", title: "Why Bed Bath & Beyond Destroyed Itself With $11 Billion in Buybacks", summary: "Coupons trained shoppers to wait, then billions in buybacks left the shelves empty.", keywords: "why bed bath and beyond failed, stock buybacks retail collapse, coupon strategy, retail bankruptcy", angle: "The chain taught people to wait for 20% off, then spent about $11 billion buying back stock instead of fixing stores.", claim: "About $11 billion in buybacks and the 20% coupon habit.", thumb: "$11 BILLION WASTED", scene: "a 20% off coupon in front of a falling store chart", rival: "home stores that skipped the coupon habit" },
  { id: 23, short: "Chick-fil-A", tier: "Starter", length: "8 min", title: "How Chick-fil-A Beats McDonald's Per Store While Closed on Sundays", summary: "Fewer operators, a short menu, and drive-thru speed beat chains that stay open seven days.", keywords: "chick fil a business model, chick fil a vs mcdonalds revenue, drive thru efficiency, franchise selection", angle: "One Chick-fil-A often clears more than $8 million a year, more than double a typical McDonald's, while closing every Sunday.", claim: "Average unit sales above $8 million and the Sunday closure versus McDonald's.", thumb: "6 DAYS > 7 DAYS", scene: "a 6-day bar towering over a 7-day bar", rival: "McDonald's" },
  { id: 24, short: "Tupperware", tier: "Starter", length: "8 min", title: "Why Tupperware Went From a Household Name to Bankruptcy", summary: "Home parties built the brand. Retail shelves and cheaper rivals arrived decades too late to save it.", keywords: "why tupperware went bankrupt, tupperware business history, direct selling model decline, household brand stories", angle: "Living-room parties built the company. It waited too long for Target and Amazon and lost the kitchen monopoly.", claim: "The party-plan model and the late move into normal retail before bankruptcy.", thumb: "WHY TUPPERWARE DIED", scene: "a classic container beside a red bankrupt stamp and a long declining curve", rival: "cheaper kitchen-storage brands in normal stores" },
  { id: 25, short: "Dyson", tier: "Starter", length: "8 min", title: "How Dyson Turned a $200 Vacuum Into an $800 Luxury Status Symbol", summary: "Thousands of prototypes, a clear dust bin, and a price people paid because they could see the engineering.", keywords: "dyson business strategy, how dyson became luxury, product pricing psychology, consumer brand story", angle: "James Dyson built 5,127 prototypes, then sold a vacuum near $800 by making the engineering visible.", claim: "5,127 prototypes and the jump from a typical $150 vacuum price toward about $800.", thumb: "THE $800 VACUUM", scene: "a price jump from $150 to $800 with a visible dust-bin icon", rival: "standard $150 vacuums" },
  { id: 26, short: "Quiznos", tier: "Starter", length: "9 min", title: "Why Quiznos Collapsed Almost Overnight After Challenging Subway", summary: "Headquarters sold franchisees marked-up meat and cheese until owners closed the doors.", keywords: "why quiznos failed, quiznos vs subway, franchise supply chain, fast food collapse", angle: "Quiznos reached about 5,000 stores, then squeezed owners on supplies until most locations shut.", claim: "A peak near 5,000 stores and a collapse that closed the vast majority.", thumb: "95% OF STORES GONE", scene: "a cliff chart labeled 5,000 stores down to a small remainder", rival: "Subway" },
  { id: 27, short: "Heinz", tier: "Starter", length: "7 min", title: "How Heinz Quietly Conquered 60% of the Global Ketchup Market", summary: "Glass bottles, tomato seeds, a slow pour, and the bottle that sits on the restaurant table.", keywords: "heinz ketchup monopoly, how heinz dominates, food brand strategy, consumer habit business", angle: "Clear glass, custom tomatoes, thickness, and restaurant tables built a lock near 60% of ketchup.", claim: "About 60% global ketchup share and the role of the glass bottle and restaurant placement.", thumb: "THE 60% MONOPOLY", scene: "a single red pie slice marked 60% dwarfing every other brand", rival: "other ketchup brands" },
  { id: 28, short: "Gap", tier: "Starter", length: "8 min", title: "Why Gap Lost Its Cool and Closed Hundreds of Stores", summary: "The khaki peak, a logo misfire, and a brand stuck between cheap basics and faster fashion.", keywords: "why gap is failing, gap brand decline, retail fashion history, old navy vs gap", angle: "Gap owned 1990s casual clothes, then got trapped between Old Navy prices and Zara speed as mall traffic fell.", claim: "Hundreds of store closures and the squeeze between cheaper and faster competitors.", thumb: "HOW GAP LOST THE MALL", scene: "the illustrated host standing between two walls labeled CHEAPER and FASTER", rival: "Old Navy and Zara" },
  { id: 29, short: "Liquid Death", tier: "Starter", length: "8 min", title: "How Liquid Death Sold Canned Water for $2 a Can", summary: "Tallboy cans, loud branding, and bar fridges turned mountain water into a billion-dollar brand.", keywords: "liquid death marketing strategy, how liquid death makes money, beverage branding, consumer product launch", angle: "Water in a tallboy can gave non-drinkers something to hold at bars and shows and built a brand near $1.4 billion.", claim: "About $2 a can versus a cheap plastic bottle, and a valuation near $1.4 billion.", thumb: "$1.4B FOR WATER?!", scene: "a tallboy can beside an arrow from a 25-cent bottle to $1.4B", rival: "standard bottled water" },
  { id: 30, short: "Kodak", tier: "Starter", length: "9 min", title: "Why Kodak Invented the Digital Camera and Let It Kill the Company", summary: "Film margins were so high that leadership buried a camera its own engineer built in 1975.", keywords: "why kodak failed, kodak digital camera story, innovators dilemma, famous company collapse", angle: "Steve Sasson built a digital camera at Kodak in 1975. Management protected film profits until the 2012 bankruptcy.", claim: "The 1975 digital camera inside Kodak and the 2012 bankruptcy.", thumb: "THEY INVENTED IT FIRST", scene: "a 1975 camera beside a film-roll chart falling off a cliff", rival: "later digital camera and phone makers" }
];

const WEEKS = [
  { id: 1, name: "Foundation", label: "Days 1 to 7", target: 3 },
  { id: 2, name: "Rhythm", label: "Days 8 to 14", target: 4 },
  { id: 3, name: "Search push", label: "Days 15 to 21", target: 4 },
  { id: 4, name: "Full cadence", label: "Days 22 to 28", target: 5 },
  { id: 5, name: "Next queue", label: "Days 29 to 30", target: 1 }
];

const PLAN = [
  { day: 1, week: 1, title: "Open the channel and lock the logo", detail: "Create the Counter Notes channel, set language to English, and use Logo.png as the profile mark.", postId: null },
  { day: 2, week: 1, title: "Script the first two videos", detail: "Write Subway and Dollar Tree in a human voice. Run the fact audit before you make any pictures.", postId: null },
  { day: 3, week: 1, title: "Post Subway", detail: "Publish video 1 with the thumbnail line WHY SUBWAY COLLAPSED. Keep the illustrated host in the frame, same as Thumbnail.png.", postId: 1 },
  { day: 4, week: 1, title: "Thumbnails and one Short", detail: "Build the Dollar Tree and Pizza Hut thumbnails. Cut one free Short from the sharpest Subway number.", postId: null },
  { day: 5, week: 1, title: "Post Dollar Tree", detail: "Publish video 2. Title, thumbnail, and narration should all promise the $1 price break.", postId: 2 },
  { day: 6, week: 1, title: "Finish Pizza Hut", detail: "Read the script out loud once. Cut any line that sounds like a press release. Keep the file light on the laptop.", postId: null },
  { day: 7, week: 1, title: "Post Pizza Hut and review", detail: "Publish video 3. Check click-through on the first two uploads. Week target: 3 posts.", postId: 3 },
  { day: 8, week: 2, title: "Script Costco and Crocs", detail: "Fact-check the $1.50 hot dog year and the Crocs comeback figures before you schedule anything.", postId: null },
  { day: 9, week: 2, title: "Post Costco", detail: "Publish video 4. Thumbnail text: STILL $1.50?!", postId: 4 },
  { day: 10, week: 2, title: "Reply and prep the next pair", detail: "Answer new comments. Build thumbnails for Crocs and Toys R Us.", postId: null },
  { day: 11, week: 2, title: "Post Crocs", detail: "Publish video 5 with the comeback chart and the illustrated host in frame.", postId: 5 },
  { day: 12, week: 2, title: "Script Toys R Us and Starbucks Australia", detail: "Audit the $5 billion debt line and the 87-store Australia count.", postId: null },
  { day: 13, week: 2, title: "Post Toys R Us", detail: "Publish video 6. Keep the thumbnail on the debt number, not a wall of logos.", postId: 6 },
  { day: 14, week: 2, title: "Post Starbucks Australia and review", detail: "Publish video 7. Note which titles got the clicks. Week target: 4 posts.", postId: 7 },
  { day: 15, week: 3, title: "Script Red Bull and Sears", detail: "Separate marketing spend from factory ownership on Red Bull. Confirm the Sears catalog timeline.", postId: null },
  { day: 16, week: 3, title: "Post Red Bull", detail: "Publish video 8. Thumbnail text: ZERO FACTORIES?!", postId: 8 },
  { day: 17, week: 3, title: "Export a Short and clear space", detail: "Pull one 30 to 40 second price clip. Delete old exports if the drive gets tight. You have about 227GB total.", postId: null },
  { day: 18, week: 3, title: "Post Sears", detail: "Publish video 9. One timeline, one collapse, the illustrated host at the turning point.", postId: 9 },
  { day: 19, week: 3, title: "Script IKEA and Spirit", detail: "Audit the store-layout claims and the $39 fare plus fees.", postId: null },
  { day: 20, week: 3, title: "Post IKEA", detail: "Publish video 10. Thumbnail text: IKEA'S HIDDEN TRAP.", postId: 10 },
  { day: 21, week: 3, title: "Post Spirit and review", detail: "Publish video 11. Week target: 4 posts. Keep the same voice and the same character.", postId: 11 },
  { day: 22, week: 4, title: "Post Chipotle", detail: "Publish video 12. You are now at the top of the weekly range. Do not add new software.", postId: 12 },
  { day: 23, week: 4, title: "Script Red Lobster and Trader Joe's", detail: "Check the $20 shrimp loss and the 4,000 versus 40,000 item count.", postId: null },
  { day: 24, week: 4, title: "Post Red Lobster", detail: "Publish video 13. Thumbnail text: THE $20 MISTAKE.", postId: 13 },
  { day: 25, week: 4, title: "Post Trader Joe's", detail: "Publish video 14. Small store, big sales per square foot, the host pointing at the short bar.", postId: 14 },
  { day: 26, week: 4, title: "Thumbnails for the next two", detail: "Blockbuster and LEGO. Read both scripts aloud. Stay on free YouTube audio if you need music.", postId: null },
  { day: 27, week: 4, title: "Post Blockbuster", detail: "Publish video 15. The $50 million offer is the picture. Confirm the late-fee figure first.", postId: 15 },
  { day: 28, week: 4, title: "Post LEGO and review", detail: "Publish video 16. Week target: 5 posts. Write down the three titles people finished.", postId: 16 },
  { day: 29, week: 5, title: "Script the next three", detail: "McDonald's, Forever 21, and Aldi. Fact-audit the rent claim before tomorrow's upload. Leave videos 18 to 30 queued for the following month except the one you post tomorrow.", postId: null },
  { day: 30, week: 5, title: "Post McDonald's and close the month", detail: "Publish video 17. Then list videos 18 to 30 as next month's queue at the same 3 to 5 posts a week.", postId: 17 }
];

const STATUS_OPTIONS = [
  { id: "queued", label: "Queued" },
  { id: "scripted", label: "Scripted" },
  { id: "ready", label: "Ready to Post" },
  { id: "posted", label: "Posted" }
];

const STORAGE = { status: "cn-status-v2", days: "cn-days-v2", audit: "cn-audit-v2", stack: "cn-stack-v1" };
const VIEWS = ["hub", "stack", "studio", "plan", "vault"];
const SOURCE_CHECKS = [
  { key: "dates", label: "Dates in my notes match a public timeline." },
  { key: "prices", label: "Prices are the real shelf, menu, or fare for that year." },
  { key: "counts", label: "Store counts, revenue, and market share have a source I can name." },
  { key: "rival", label: "The rival comparison uses the same years and the same metric." },
  { key: "notes", label: "My pasted notes are inside the fact prompt before I copy it." },
  { key: "hold", label: "I will not generate the video until every open number is checked." }
];

let currentView = "hub";
let studioId = 1;
let vaultVideoId = 1;
let ideaFilter = "all";
let statuses = {};
let days = {};
let audit = {};
let stack = defaultStack();

function defaultStack() {
  return {
    topicId: 1,
    custom: "",
    thumbLine: "",
    notes: "",
    checks: {},
    saved: false,
    usedOn: "",
    queue: []
  };
}

function todayStamp() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

function loadStack() {
  const raw = loadMap(STORAGE.stack);
  const topicId = raw.topicId === "custom" ? "custom" : (videoById(raw.topicId) ? Number(raw.topicId) : 1);
  const queue = Array.isArray(raw.queue) ? raw.queue.slice(0, 30).filter((row) => row && row.title) : [];
  return {
    topicId,
    custom: typeof raw.custom === "string" ? raw.custom : "",
    thumbLine: typeof raw.thumbLine === "string" ? raw.thumbLine : "",
    notes: typeof raw.notes === "string" ? raw.notes : "",
    checks: raw.checks && typeof raw.checks === "object" ? raw.checks : {},
    saved: !!raw.saved,
    usedOn: typeof raw.usedOn === "string" ? raw.usedOn : "",
    queue
  };
}

function saveStack() {
  saveMap(STORAGE.stack, stack);
}

function loadMap(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    return {};
  }
}

function saveMap(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function videoById(id) {
  return VIDEOS.find((video) => video.id === Number(id));
}

function statusOf(id) {
  const value = statuses[id] || "queued";
  return STATUS_OPTIONS.some((item) => item.id === value) ? value : "queued";
}

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

function wordTarget(length) {
  const mins = parseInt(length, 10) || 8;
  return mins * 145;
}

function ideasPromptText() {
  const lines = VIDEOS.map((video) => {
    const label = statusOf(video.id).toUpperCase();
    return `${String(video.id).padStart(2, "0")}. [${label}] ${video.title} (${video.length}, ${video.tier})`;
  }).join("\n");
  return `Build the Counter Notes publishing board.

Channel: Counter Notes
Niche: everyday restaurants, retail stores, and consumer products. Explain why they win, fail, or lose to a rival using timelines, prices, and simple charts. Stay off tech products.
Voice: Colton, a confident US male.
Cadence: 3 to 5 videos a week.
Money: YouTube AdSense.
Budget: $0 new software on an HP laptop with 8GB to 12GB RAM and about 227GB of storage.
Character: ${CHARACTER}. Put this same person in the logo direction and in every 16:9 thumbnail.

The slate below is locked. Do not swap in new topics. For every video marked QUEUED, write:
- a one-sentence spoken hook
- a 2 to 4 word thumbnail line
- the single number a human must fact-check before posting

${lines}`;
}

function scriptPromptText(video) {
  const words = wordTarget(video.length);
  return `Write a YouTube script for Counter Notes. It will be read by Colton, a confident US male.

Write the way a sharp person talks after they actually checked the receipt. Short sentences. Real numbers. Contractions are good. Do not open with "welcome back" or "in this video". Do not use filler like delve, tapestry, landscape, unlock, robust, or "let's dive in".

Title: ${video.title}
Runtime: ${video.length}, about ${words} words
Angle: ${video.angle}
Rival to compare: ${video.rival}
Number that must survive a fact check: ${video.claim}

Use these sections, in this order:
1. Hook, first 20 seconds. Open on one surprising price, store count, or margin.
2. The rise. How the brand first won customers, with dates.
3. The turn. The decision that changed the math.
4. The comparison. Same metric, same years, against ${video.rival}.
5. The takeaway. One lesson a shopper or an owner can use this week.
6. The close. One comment question, then a plain line that Counter Notes posts 3 to 5 breakdowns a week.

For every section, add these cues:
- On-screen text: 3 to 5 words
- Host: what ${CHARACTER} does in that moment
- Chart: the timeline, price, or bar that is on screen
- Music: a short mood label, such as quiet investigative pulse

Visual style: minimalist and clean. Dark background #0F0F0F, white type, YouTube red #FF0000 on the key number.
Production: no new paid software. Simple scenes that render on an HP laptop with 8GB to 12GB RAM.`;
}

function thumbPromptText(video, concept) {
  return `YouTube thumbnail, 16:9. Match Thumbnail.png.
Dark background, bold white words, one red #FF0000 shape.
Host, large on the left: ${CHARACTER}
Action: ${concept.action}.
The only words on the image: "${concept.text}".
Chart or price on the right. Crisp outlines, high contrast, same cartoon style as Character.png.`;
}

function thumbConcepts(video) {
  return [
    { name: "The number", text: video.thumb, action: `standing beside ${video.scene}, price tag raised toward the key figure` },
    { name: "The split", text: "HOW IT CHANGED", action: `standing on the line between a rising white bar and a falling red bar about ${video.rival}` },
    { name: "The receipt", text: "CHECK THE MATH", action: `holding the clipboard next to a giant receipt where this claim is circled: ${video.claim}` }
  ];
}

function auditItems(video) {
  return [
    { key: "dates", label: `Dates in "${video.title}" match a public timeline.` },
    { key: "numbers", label: `Revenue, store counts, and market share are checked. Hook number: ${video.claim}` },
    { key: "price", label: "Every price on screen is the real shelf price, menu price, or fare for that year." },
    { key: "rival", label: `The comparison with ${video.rival} uses the same years and the same metric.` },
    { key: "original", label: "Script, charts, and thumbnail are original to Counter Notes." },
    { key: "fairuse", label: "Logos and product shots are brief commentary, not the whole frame or the whole video." },
    { key: "voice", label: "A read-aloud pass sounds like a person. Stiff lines are cut." },
    { key: "promise", label: "Title, thumbnail text, and narration promise the same story." }
  ];
}

function auditPromptText(video) {
  const lines = auditItems(video).map((item) => {
    const mark = audit[video.id + ":" + item.key] ? "x" : " ";
    return `- [${mark}] ${item.label}`;
  }).join("\n");
  return `Fact audit for Counter Notes. Do this before publishing.

Video: ${video.title}
Claim to prove or rewrite: ${video.claim}

Check each line against a public source such as a company report, a regulator filing, or a named news story. If you cannot source a number, rewrite the sentence. Do not invent a source.

${lines}

Originality and fair use:
- The narration, charts, and thumbnail must be made for this channel.
- A logo may appear only as part of the commentary, not as the entire thumbnail.
- Do not copy another channel's script, edit, or thumbnail layout.

Reply with PASS or FIX on each line, the source name, and a replacement sentence where you mark FIX.`;
}

function videoTags(video) {
  const extra = ["Counter Notes", "business documentary", "brand breakdown", "retail history", "everyday economics", "why brands fail", "consumer brands", "company story", "business strategy"];
  const parts = [video.title.toLowerCase().replace(/[^a-z0-9 ]/g, ""), ...video.keywords.split(",").map((part) => part.trim()), ...extra];
  const seen = new Set();
  const unique = [];
  parts.forEach((part) => {
    const key = part.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(part);
  });
  return unique.slice(0, 15).join(", ");
}

function videoHashtags(video) {
  const words = video.keywords.split(",").map((part) => "#" + part.replace(/[^a-zA-Z0-9]/g, "")).filter((tag) => tag.length > 1);
  const base = ["#CounterNotes", "#BusinessStories", "#BrandBreakdown", "#RetailHistory", "#EverydayEconomics"];
  return words.concat(base).slice(0, 12).join(" ");
}

function videoDescription(video) {
  return `${video.summary}

This Counter Notes breakdown follows the price, the store count, and the decision that changed the business.

What you will see:
- How the brand first won customers
- The turn that changed the math
- A side-by-side look at ${video.rival}
- One takeaway you can spot on a normal shopping trip

Timestamps:
0:00 The number that starts the story
0:50 How the lead was built
2:30 The turn
5:00 The comparison
7:00 The takeaway

Counter Notes posts 3 to 5 brand breakdowns a week.

This video is commentary and education. It is not financial advice.

${videoHashtags(video)}`;
}

function masterPromptText() {
  return `You are the writer and producer for Counter Notes.

Channel name: Counter Notes
Niche: everyday brand and business stories, not tech. Restaurants, retail stores, and consumer products. Why they succeed, fail, or lose to a rival. Use clean timelines, price comparisons, and simple charts.
Look: minimalist. Background #0F0F0F, cards #181818 and #222222, text #FFFFFF, notes #A3A3A3, accent #FF0000.
Character: ${CHARACTER}. This person is the logo and the host of every 16:9 thumbnail.
Voice: Colton, US male.
Cadence: 3 to 5 videos a week.
Money: YouTube AdSense.
Gear: $0 new software, HP laptop, 8GB to 12GB RAM, about 227GB storage.

Write like a person who has worked a register. No stiff AI phrasing. Every factual number must be marked for a human fact check.`;
}

function humanizerMasterText() {
  return `Humanize this Counter Notes script for Colton, a US male narrator.

Rules:
- Sound like a sharp storyteller, not a memo.
- Open on a number, a price, or a store count.
- One idea per sentence. Use contractions.
- Keep every date, price, and store count, but mark any figure you cannot prove with [CHECK].
- Add a chart cue and a host cue every few lines.
- Host look: ${CHARACTER}.
- Cut these habits: delve, tapestry, landscape, unlock, robust, "in today's video", "let's dive in", "it's important to note".
- End with one comment question and a plain subscribe line for 3 to 5 videos a week.

Paste the stiff draft under this line:

`;
}

function adsenseSnippet() {
  return `function monthlyAdSense(viewsPerVideo, videosPerMonth, cpm) {
  return (viewsPerVideo * videosPerMonth * cpm) / 1000;
}

// 4 videos a week is about 16 videos a month.
// Example: monthlyAdSense(5000, 16, 4) = 320
`;
}

function statusSnippet() {
  return `const postingStatus = {
  queued: "Queued",
  scripted: "Scripted",
  ready: "Ready to Post",
  posted: "Posted"
};

// Saved in this browser only. No API key.
localStorage.setItem("cn-status-v2", JSON.stringify({ "1": "scripted" }));
`;
}

function cssSnippet() {
  return `:root {
  --bg: #0F0F0F;
  --surface: #181818;
  --surface-2: #222222;
  --text: #FFFFFF;
  --muted: #A3A3A3;
  --red: #FF0000;
}
`;
}

function copyBox(id, text, label, tall) {
  return `<pre class="copy-box${tall ? " tall" : ""}" id="${id}">${esc(text)}</pre>
    <button type="button" class="copy-btn" onclick="copyFrom('${id}', this)"><i data-lucide="copy"></i><span>${esc(label)}</span></button>`;
}

function nextPostDay() {
  return PLAN.find((item) => item.postId && !days[item.day]) || null;
}

function nextOpenDay() {
  return PLAN.find((item) => !days[item.day]) || null;
}

function updateChrome() {
  const pill = document.getElementById("nextPill");
  if (!pill) return;
  const next = nextPostDay();
  if (!next) {
    pill.innerHTML = `<i data-lucide="circle-check"></i> 30-day posts are done`;
  } else {
    const video = videoById(next.postId);
    pill.innerHTML = `<i data-lucide="arrow-right"></i> Next: Day ${next.day}, ${esc(video.short)}`;
  }
  refreshIcons();
}

function showView(view, fromHash) {
  if (!VIEWS.includes(view)) view = "hub";
  currentView = view;
  if (!fromHash && location.hash !== "#" + view) location.hash = view;
  document.querySelectorAll(".nav-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  const main = document.getElementById("mainArea");
  if (!main) return;
  main.innerHTML = renderView(view);
  main.scrollTop = 0;
  refreshIcons();
  updateChrome();
}

function renderView(view) {
  if (view === "stack") return renderStack();
  if (view === "studio") return renderStudio();
  if (view === "plan") return renderPlan();
  if (view === "vault") return renderVault();
  return renderHub();
}

function stackTopic() {
  if (stack.topicId === "custom") {
    const title = stack.custom.trim() || "Untitled brand story";
    return {
      custom: true,
      title,
      length: "8 min",
      angle: "Why " + title + " succeeded, failed, or lost to a rival. Use a timeline, a price comparison, and one simple chart.",
      rival: "the closest everyday rival a shopper would recognize",
      claim: "Only the numbers in the source notes. If a number is missing, mark it [CHECK].",
      thumb: "CHECK THE MATH",
      scene: "one chart and one price tag"
    };
  }
  const video = videoById(stack.topicId) || VIDEOS[0];
  return Object.assign({ custom: false }, video);
}

function stackNotesBlock() {
  const notes = stack.notes.trim();
  if (!notes) return "No source notes pasted yet. Do not invent a number. Mark every missing figure [CHECK].";
  return notes;
}

function stackOverlay() {
  const typed = stack.thumbLine.trim();
  if (typed) return typed;
  const topic = stackTopic();
  return topic.custom ? "CHECK THE MATH" : topic.thumb;
}

function researchPromptText(topic) {
  return `Research this Counter Notes story before any script is written.

Channel: Counter Notes
Niche: everyday brands, restaurants, retail stores, and consumer products. Timelines, price comparisons, and simple charts.
Voice later: Colton, US male.
Cadence: 3 to 5 videos a week.

Topic: ${topic.title}
Working angle: ${topic.angle}
Rival: ${topic.rival}
Claim to verify: ${topic.claim}

My source notes:
${stackNotesBlock()}

Return a fact sheet only:
- A timeline with years
- Prices, store counts, and margins, each with where a human should confirm it
- One comparison against the rival using the same years and the same metric
- The single chart this video needs
- A 2 to 4 word thumbnail line
- Any number you cannot prove, marked [CHECK]

Do not write the spoken script yet.`;
}

function stackScriptPrompt(topic) {
  const notes = `Source notes from my own check. Use these numbers. If a line conflicts with the claim, follow the notes and mark the conflict [CHECK]:
${stackNotesBlock()}`;
  if (!topic.custom) return scriptPromptText(topic) + "\n\n" + notes;
  return `Write a YouTube script for Counter Notes. It will be read by Colton, a confident US male.

Write the way a sharp person talks after they actually checked the receipt. Short sentences. Real numbers. Contractions are good. Do not open with "welcome back" or "in this video". Do not use filler like delve, tapestry, landscape, unlock, robust, or "let's dive in".

Title: ${topic.title}
Runtime: ${topic.length}, about ${wordTarget(topic.length)} words
Angle: ${topic.angle}
Rival to compare: ${topic.rival}
Number that must survive a fact check: ${topic.claim}

Use these sections, in this order:
1. Hook, first 20 seconds. Open on one surprising price, store count, or margin.
2. The rise. How the brand first won customers, with dates.
3. The turn. The decision that changed the math.
4. The comparison. Same metric, same years, against ${topic.rival}.
5. The takeaway. One lesson a shopper or an owner can use this week.
6. The close. One comment question, then a plain line that Counter Notes posts 3 to 5 breakdowns a week.

For every section, add these cues:
- On-screen text: 3 to 5 words
- Host: what ${CHARACTER} does in that moment
- Chart: the timeline, price, or bar that is on screen
- Music: a short mood label, such as quiet investigative pulse

Visual style: minimalist and clean. Dark background #0F0F0F, white type, YouTube red #FF0000 on the key number.
Production: no new paid software. Simple scenes that render on an HP laptop with 8GB to 12GB RAM.

${notes}`;
}

function stackThumbPrompt(topic) {
  return thumbPromptText(topic, {
    text: stackOverlay(),
    action: `standing on the left beside ${topic.scene}, clipboard in one hand and yellow price tag in the other`
  });
}

function factPromptText(topic) {
  return `Fact and source check for a Counter Notes video. Do not write a script.

Topic: ${topic.title}
Claim: ${topic.claim}
Rival: ${topic.rival}

Source notes I pasted:
${stackNotesBlock()}

For each number, date, and price:
- Say whether the notes support it
- Name the kind of source a human should open, such as a company filing, a menu archive, a news report, or a store-count chart
- Keep the figure if the notes support it
- Replace a weak figure with [CHECK]
- Flag any mismatch between the claim and the notes

End with three lines only:
1. SAFE TO SCRIPT, or HOLD
2. The one chart
3. A 2 to 4 word thumbnail line`;
}

function stackStateText() {
  const saved = stack.saved ? "Saved to queue." : "Not saved yet.";
  let used = "Not marked used.";
  if (stack.usedOn === todayStamp()) used = "Marked used today.";
  else if (stack.usedOn) used = "Last marked used on " + stack.usedOn + ".";
  return saved + " " + used;
}

function stackKey() {
  if (stack.topicId === "custom") return "custom:" + (stack.custom.trim().toLowerCase() || "untitled");
  return String(stack.topicId);
}

function setStackTopic(value) {
  const next = value === "custom" ? "custom" : Number(value);
  if (String(next) !== String(stack.topicId)) {
    stack.checks = {};
    stack.usedOn = "";
    stack.saved = false;
    stack.thumbLine = next === "custom" ? (stack.thumbLine || "CHECK THE MATH") : ((videoById(next) || VIDEOS[0]).thumb);
  }
  stack.topicId = next;
  saveStack();
  showView("stack", true);
}

function onStackField(field, value) {
  stack[field] = value;
  stack.saved = false;
  saveStack();
  refreshStackPrompts();
}

function refreshStackPrompts() {
  const topic = stackTopic();
  const pairs = [
    ["stackResearch", researchPromptText(topic)],
    ["stackScript", stackScriptPrompt(topic)],
    ["stackThumb", stackThumbPrompt(topic)],
    ["stackFact", factPromptText(topic)]
  ];
  pairs.forEach((pair) => {
    const node = document.getElementById(pair[0]);
    if (node) node.textContent = pair[1];
  });
  const state = document.getElementById("stackState");
  if (state) state.textContent = stackStateText();
}

function toggleStackCheck(key) {
  stack.checks[key] = !stack.checks[key];
  saveStack();
  const row = document.getElementById("src_" + key);
  if (row) row.classList.toggle("done", !!stack.checks[key]);
}

function saveToQueue() {
  const topic = stackTopic();
  const row = {
    key: stackKey(),
    topicId: stack.topicId,
    custom: stack.custom,
    thumbLine: stack.thumbLine,
    notes: stack.notes,
    checks: stack.checks,
    title: topic.title,
    savedAt: todayStamp(),
    usedOn: stack.usedOn || ""
  };
  const index = stack.queue.findIndex((item) => item.key === row.key);
  if (index >= 0) stack.queue[index] = row;
  else stack.queue.unshift(row);
  stack.queue = stack.queue.slice(0, 30);
  stack.saved = true;
  saveStack();
  showView("stack", true);
}

function markStackUsed() {
  stack.usedOn = todayStamp();
  const index = stack.queue.findIndex((item) => item.key === stackKey());
  if (index >= 0) stack.queue[index].usedOn = stack.usedOn;
  saveStack();
  showView("stack", true);
}

function loadQueued(index) {
  const row = stack.queue[index];
  if (!row) return;
  stack.topicId = row.topicId === "custom" ? "custom" : Number(row.topicId);
  stack.custom = row.custom || "";
  stack.thumbLine = row.thumbLine || "";
  stack.notes = row.notes || "";
  stack.checks = row.checks && typeof row.checks === "object" ? row.checks : {};
  stack.usedOn = row.usedOn || "";
  stack.saved = true;
  saveStack();
  showView("stack", true);
}

function renderStack() {
  const topic = stackTopic();
  const customField = stack.topicId === "custom"
    ? `<label class="stat-label" for="stackCustom">Custom brand or business</label>
       <input class="stack-input" id="stackCustom" value="${esc(stack.custom)}" placeholder="Name the restaurant, store, or product" oninput="onStackField('custom', this.value)">`
    : "";
  const options = [`<option value="custom"${stack.topicId === "custom" ? " selected" : ""}>Custom brand or business</option>`]
    .concat(VIDEOS.map((video) => `<option value="${video.id}"${Number(stack.topicId) === video.id ? " selected" : ""}>#${video.id} ${esc(video.short)}: ${esc(video.title)}</option>`))
    .join("");
  const queueHtml = stack.queue.length
    ? stack.queue.map((row, index) => {
        const used = row.usedOn === todayStamp() ? "Used today" : (row.usedOn ? "Used " + row.usedOn : "Not used yet");
        return `<div class="queue-row">
          <div>
            <strong>${esc(row.title)}</strong>
            <div class="queue-meta${row.usedOn === todayStamp() ? " used" : ""}">Saved ${esc(row.savedAt || "")} · ${esc(used)}</div>
          </div>
          <button type="button" class="linkish" onclick="loadQueued(${index})">Open</button>
        </div>`;
      }).join("")
    : `<p class="section-sub">Nothing saved yet. Build today's stack, then save it.</p>`;
  const checks = SOURCE_CHECKS.map((item) => {
    const done = !!stack.checks[item.key];
    return `<label class="task-item${done ? " done" : ""}" id="src_${item.key}">
      <input type="checkbox" ${done ? "checked" : ""} onchange="toggleStackCheck('${item.key}')">
      <span class="task-copy">${esc(item.label)}</span>
    </label>`;
  }).join("");
  return `
    <div class="section-title"><i data-lucide="layers"></i> Today's Prompt Stack</div>
    <p class="section-sub">Pick one of the 30 ideas or type a brand of your own. The three prompts update from that choice and from the notes you paste. Nothing leaves this browser.</p>

    <div class="card">
      <h3><i data-lucide="list-plus"></i> Today's topic</h3>
      <label class="stat-label" for="stackTopic">Video from the 30, or a custom topic</label>
      <select class="field video-select" id="stackTopic" onchange="setStackTopic(this.value)">${options}</select>
      ${customField}
      <label class="stat-label" for="stackThumbLine">Thumbnail words</label>
      <input class="stack-input" id="stackThumbLine" value="${esc(stack.thumbLine || topic.thumb)}" oninput="onStackField('thumbLine', this.value)">
      <p class="stack-state" id="stackState">${esc(stackStateText())}</p>
      <div class="stack-actions">
        <button type="button" class="copy-btn solid" onclick="saveToQueue()"><i data-lucide="bookmark"></i> Save to Queue</button>
        <button type="button" class="copy-btn" onclick="markStackUsed()"><i data-lucide="calendar-check"></i> Mark Prompt Used Today</button>
      </div>
    </div>

    <div class="card">
      <h3><i data-lucide="search"></i> 1. Topic research and fact check</h3>
      ${copyBox("stackResearch", researchPromptText(topic), "Copy research prompt", true)}
    </div>

    <div class="card">
      <h3><i data-lucide="mic"></i> 2. Humanized script</h3>
      <p style="color:var(--muted);font-size:13px;">Written for Colton, with the host from Character.png in the scene cues.</p>
      ${copyBox("stackScript", stackScriptPrompt(topic), "Copy script prompt", true)}
    </div>

    <div class="card">
      <h3><i data-lucide="image"></i> 3. Thumbnail</h3>
      <p style="color:var(--muted);font-size:13px;">Matches Thumbnail.png: host on the left, short bold text, one chart, red accent.</p>
      ${copyBox("stackThumb", stackThumbPrompt(topic), "Copy thumbnail prompt")}
    </div>

    <div class="card">
      <h3><i data-lucide="list-checks"></i> Source and fact cross-check</h3>
      <p style="color:var(--muted);font-size:13px;">Paste the numbers, dates, and links you already checked. The prompt below repeats them so you can verify the claim before a video is made.</p>
      <label class="stat-label" for="stackNotes">Your source notes</label>
      <textarea class="stack-note" id="stackNotes" oninput="onStackField('notes', this.value)">${esc(stack.notes)}</textarea>
      ${checks}
      <h4>Fact and source verification prompt</h4>
      ${copyBox("stackFact", factPromptText(topic), "Copy fact prompt", true)}
    </div>

    <div class="card">
      <h3><i data-lucide="inbox"></i> Saved queue</h3>
      ${queueHtml}
    </div>

    <div class="card">
      <h3><i data-lucide="feather"></i> Kept light on purpose</h3>
      <p>Today's stack, your notes, and the used-today mark stay in this browser. No account and no API key. The prompts are plain text, so a saved preset or a small backend can pick them up later without rebuilding this page.</p>
    </div>
  `;
}

function renderHub() {
  return `
    <div class="section-title"><i data-lucide="user-round"></i> Character</div>
    <p class="section-sub">Logo.png, Character.png, and Thumbnail.png. The host is the illustrated man in the dark slate t-shirt, clipboard in one hand, yellow price tag in the other.</p>

    <div class="card">
      <div class="asset-grid">
        <img src="Logo.png" alt="Counter Notes logo" class="asset-shot">
        <img src="Thumbnail.png" alt="16:9 thumbnail with the Counter Notes host" class="asset-shot">
      </div>
      <img src="Character.png" alt="Counter Notes illustrated host" class="asset-shot character-shot">
    </div>

    <div class="card">
      <h3><i data-lucide="lock"></i> Locked channel settings</h3>
      <div class="grid-3">
        <div class="stat-box"><div class="stat-label"><i data-lucide="clapperboard"></i> Channel</div><div class="stat-val">Counter Notes</div></div>
        <div class="stat-box"><div class="stat-label"><i data-lucide="store"></i> Niche</div><div class="stat-val">Restaurants, retail, everyday products</div></div>
        <div class="stat-box"><div class="stat-label"><i data-lucide="mic"></i> Voice</div><div class="stat-val">Colton (US male)</div></div>
        <div class="stat-box"><div class="stat-label"><i data-lucide="calendar-days"></i> Cadence</div><div class="stat-val">3 to 5 videos a week</div></div>
        <div class="stat-box"><div class="stat-label"><i data-lucide="badge-dollar-sign"></i> Money</div><div class="stat-val">YouTube AdSense</div></div>
        <div class="stat-box"><div class="stat-label"><i data-lucide="laptop"></i> Gear</div><div class="stat-val">$0 software, HP laptop, 8GB to 12GB RAM, about 227GB</div></div>
      </div>
    </div>
  `;
}

function renderStudio() {
  const counts = { all: VIDEOS.length, queued: 0, scripted: 0, ready: 0, posted: 0 };
  VIDEOS.forEach((video) => { counts[statusOf(video.id)] += 1; });
  const filters = [{ id: "all", label: "All" }, ...STATUS_OPTIONS];
  return `
    <div class="section-title"><i data-lucide="pen-line"></i> Prompt and Humanizer Studio</div>
    <p class="section-sub">Track all 30 videos, then build a spoken script, three thumbnail prompts, and a fact audit. Everything copies out. Nothing calls an API.</p>
    <div class="subnav">
      <button type="button" onclick="jumpTo('ideas')"><i data-lucide="list"></i> 30 ideas</button>
      <button type="button" onclick="jumpTo('humanizer')"><i data-lucide="scroll-text"></i> Humanizer</button>
      <button type="button" onclick="jumpTo('thumbs')"><i data-lucide="image"></i> Thumbnails</button>
      <button type="button" onclick="jumpTo('audit')"><i data-lucide="list-checks"></i> Fact audit</button>
    </div>

    <div class="card anchor" id="ideas">
      <h3><i data-lucide="list"></i> 30 brand videos and posting status</h3>
      <div class="count-row">
        <span class="count-pill" id="count-queued">${counts.queued} Queued</span>
        <span class="count-pill" id="count-scripted">${counts.scripted} Scripted</span>
        <span class="count-pill" id="count-ready">${counts.ready} Ready to Post</span>
        <span class="count-pill" id="count-posted">${counts.posted} Posted</span>
      </div>
      <div class="filter-row">
        ${filters.map((item) => `<button type="button" class="filter-chip${ideaFilter === item.id ? " active" : ""}" onclick="setIdeaFilter('${item.id}')">${esc(item.label)}</button>`).join("")}
      </div>
      <div id="ideaBoard">
        ${VIDEOS.map((video) => ideaRow(video)).join("")}
      </div>
      <h4>Copy the board as a prompt</h4>
      <p style="color:var(--muted);font-size:13px;">Status labels update in this prompt as you change them above.</p>
      ${copyBox("ideasPrompt", ideasPromptText(), "Copy 30-idea prompt", true)}
    </div>

    <div class="card anchor" id="humanizer">
      <h3><i data-lucide="scroll-text"></i> Build a humanized script pack</h3>
      <label class="stat-label" for="studioPick">Choose a video</label>
      <select id="studioPick" class="field video-select" onchange="onStudioVideo(this.value)">
        ${VIDEOS.map((video) => `<option value="${video.id}"${video.id === studioId ? " selected" : ""}>#${video.id} ${esc(video.title)}</option>`).join("")}
      </select>
      <div id="pack">${packHtml(videoById(studioId))}</div>
    </div>
  `;
}

function ideaRow(video) {
  const status = statusOf(video.id);
  const hidden = ideaFilter !== "all" && ideaFilter !== status ? " hidden" : "";
  return `<div class="idea-row" id="idea-${video.id}" data-status="${status}"${hidden}>
      <div class="idea-num">#${String(video.id).padStart(2, "0")}</div>
      <div>
        <div class="idea-title">${esc(video.title)}</div>
        <div class="idea-meta"><i data-lucide="clock-3"></i> ${esc(video.length)} · ${esc(video.tier)}</div>
      </div>
      <select aria-label="Posting status for ${esc(video.title)}" onchange="setStatus(${video.id}, this.value)">
        ${STATUS_OPTIONS.map((item) => `<option value="${item.id}"${item.id === status ? " selected" : ""}>${item.label}</option>`).join("")}
      </select>
    </div>`;
}

function packHtml(video) {
  const concepts = thumbConcepts(video);
  const items = auditItems(video);
  const done = items.filter((item) => audit[video.id + ":" + item.key]).length;
  return `
    <div class="anchor" id="scriptBlock">
      <h4>Humanized script prompt</h4>
      <p style="color:var(--muted);font-size:13px;">Written for a person talking, with hooks, a timeline, a price comparison, and a cue for the illustrated host.</p>
      ${copyBox("scriptPrompt", scriptPromptText(video), "Copy script prompt", true)}
    </div>
    <div class="anchor" id="thumbs">
      <h4>Thumbnail concepts</h4>
      <p style="color:var(--muted);font-size:13px;">Each prompt uses the illustrated host from Character.png, with short text and a chart.</p>
      ${concepts.map((concept, index) => `<div class="thumb-card">
          <strong>${esc(concept.name)}: ${esc(concept.text)}</strong>
          ${copyBox("thumb-" + video.id + "-" + index, thumbPromptText(video, concept), "Copy thumbnail prompt")}
        </div>`).join("")}
    </div>
    <div class="anchor" id="audit">
      <h4>Cross-check and fact audit</h4>
      <p style="color:var(--muted);font-size:13.5px;" id="auditMeter">${done} of ${items.length} checks done for this video.</p>
      ${items.map((item) => {
        const on = !!audit[video.id + ":" + item.key];
        return `<label class="task-item${on ? " done" : ""}" id="audit-${video.id}-${item.key}">
          <input type="checkbox" ${on ? "checked" : ""} onchange="toggleAudit(${video.id}, '${item.key}', this.checked)">
          <span class="task-copy">${esc(item.label)}</span>
        </label>`;
      }).join("")}
      ${copyBox("auditPrompt", auditPromptText(video), "Copy fact-audit prompt", true)}
    </div>
  `;
}

function renderPlan() {
  const doneDays = PLAN.filter((item) => days[item.day]).length;
  const pct = Math.round((doneDays / PLAN.length) * 100);
  return `
    <div class="section-title"><i data-lucide="calendar-range"></i> 30-day launch and posting plan</div>
    <p class="section-sub">Days 1 to 30. Week 1 is lighter while you set the channel up. Later weeks sit inside 3 to 5 uploads. Check a day when the work is actually done.</p>
    <div class="next-card" id="nextCard">${nextCardInner()}</div>
    <div class="card">
      <div class="week-head">
        <h3 style="margin:0;"><i data-lucide="list-checks"></i> Progress</h3>
        <span class="week-target" id="planDoneLabel">${doneDays} of 30 days done</span>
      </div>
      <div class="progress"><span id="planBar" style="width:${pct}%"></span></div>
      <div class="grid-3">
        ${WEEKS.map((week) => {
          const posts = PLAN.filter((item) => item.week === week.id && item.postId && days[item.day]).length;
          return `<div class="stat-box">
            <div class="stat-label">${esc(week.name)}</div>
            <div class="stat-val">${esc(week.label)}</div>
            <div class="week-target" id="weekCount-${week.id}">${posts} of ${week.target} posts done</div>
          </div>`;
        }).join("")}
      </div>
    </div>
    ${WEEKS.map((week) => `
      <div class="card">
        <div class="week-head">
          <h3 style="margin:0;">${esc(week.name)}</h3>
          <span class="week-target">${esc(week.label)} · target ${week.target} post${week.target === 1 ? "" : "s"}</span>
        </div>
        ${PLAN.filter((item) => item.week === week.id).map((item) => dayRow(item)).join("")}
      </div>
    `).join("")}
  `;
}

function dayRow(item) {
  const on = !!days[item.day];
  const video = item.postId ? videoById(item.postId) : null;
  const posted = video && statusOf(video.id) === "posted";
  return `<div class="day-block${on ? " done" : ""}" id="day-${item.day}">
    <label class="task-item${on ? " done" : ""}">
      <input type="checkbox" ${on ? "checked" : ""} onchange="toggleDay(${item.day}, this.checked)">
      <span class="task-copy">
        <strong>Day ${item.day}. ${esc(item.title)}</strong>
        <small>${esc(item.detail)}</small>
      </span>
    </label>
    ${video ? `<div class="day-actions"><button type="button" class="linkish" onclick="markVideoPosted(${video.id})">${posted ? "Video marked Posted" : "Mark " + esc(video.short) + " as Posted"}</button></div>` : ""}
  </div>`;
}

function nextCardInner() {
  const next = nextPostDay();
  const open = nextOpenDay();
  if (!next) {
    return `<h3><i data-lucide="circle-check"></i> What to post next</h3>
      <p>The 17 launch posts are checked off. Keep videos 18 to 30 on the board and run the same 3 to 5 posts a week.</p>`;
  }
  const video = videoById(next.postId);
  const ahead = open && open.day < next.day
    ? `<p style="color:var(--muted);margin-top:6px;">Finish Day ${open.day} first: ${esc(open.title)}.</p>`
    : "";
  return `<h3><i data-lucide="arrow-right"></i> What to post next</h3>
    <p><strong>Day ${next.day}: ${esc(video.title)}</strong></p>
    <p style="color:var(--muted);margin-top:4px;">Thumbnail line: ${esc(video.thumb)}. Voice: Colton. Use the host from Thumbnail.png.</p>
    ${ahead}
    <p style="margin-top:8px;"><button type="button" class="linkish" onclick="openNextInStudio()">Open this video in the studio</button></p>`;
}

function renderVault() {
  const video = videoById(vaultVideoId);
  return `
    <div class="section-title"><i data-lucide="folder-key"></i> Prompt and code vault</div>
    <p class="section-sub">Full-width copy boxes for the master prompts, channel SEO, a per-video SEO pack, and small snippets. Still no API key.</p>
    <div class="card">
      <h3><i data-lucide="sparkles"></i> Master channel prompt</h3>
      ${copyBox("masterPrompt", masterPromptText(), "Copy master prompt", true)}
    </div>
    <div class="card">
      <h3><i data-lucide="pen-line"></i> Humanizer prompt</h3>
      ${copyBox("humanMaster", humanizerMasterText(), "Copy humanizer prompt", true)}
    </div>
    <div class="card">
      <h3><i data-lucide="list"></i> 30-idea prompt with live status</h3>
      ${copyBox("vaultIdeas", ideasPromptText(), "Copy 30-idea prompt", true)}
    </div>
    <div class="card">
      <h3><i data-lucide="image"></i> Thumbnail character prompt</h3>
      ${copyBox("thumbMaster", thumbPromptText(VIDEOS[0], { text: "SHORT TEXT", action: "standing beside one bold chart, price tag aimed at the number" }), "Copy thumbnail prompt")}
    </div>
    <div class="card">
      <h3><i data-lucide="text"></i> Channel description</h3>
      ${copyBox("channelDesc", CHANNEL_DESC, "Copy channel description")}
    </div>
    <div class="card">
      <h3><i data-lucide="tags"></i> Channel tags</h3>
      ${copyBox("channelTags", CHANNEL_TAGS, "Copy channel tags")}
    </div>
    <div class="card">
      <h3><i data-lucide="file-text"></i> Per-video SEO pack</h3>
      <label class="stat-label" for="vaultPick">Video</label>
      <select id="vaultPick" class="field video-select" onchange="onVaultVideo(this.value)">
        ${VIDEOS.map((item) => `<option value="${item.id}"${item.id === vaultVideoId ? " selected" : ""}>#${item.id} ${esc(item.title)}</option>`).join("")}
      </select>
      <div id="vaultSeo">${vaultSeoHtml(video)}</div>
    </div>
    <div class="card">
      <h3><i data-lucide="code"></i> Brand tokens</h3>
      ${copyBox("cssSnippet", cssSnippet(), "Copy CSS tokens")}
    </div>
    <div class="card">
      <h3><i data-lucide="badge-dollar-sign"></i> AdSense math</h3>
      <p style="color:var(--muted);font-size:13.5px;">Monthly AdSense is views per video, times videos per month, times CPM, divided by 1,000.</p>
      ${copyBox("adsenseSnippet", adsenseSnippet(), "Copy formula")}
    </div>
    <div class="card">
      <h3><i data-lucide="database"></i> Posting status shape</h3>
      ${copyBox("statusSnippet", statusSnippet(), "Copy status snippet")}
    </div>
  `;
}

function vaultSeoHtml(video) {
  return `<h4>Description</h4>
    ${copyBox("seoDesc", videoDescription(video), "Copy video description", true)}
    <h4>Tags</h4>
    ${copyBox("seoTags", videoTags(video), "Copy video tags")}`;
}

function jumpTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setIdeaFilter(filter) {
  ideaFilter = filter;
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.textContent === labelForFilter(filter));
  });
  document.querySelectorAll(".idea-row").forEach((row) => {
    row.hidden = filter !== "all" && row.dataset.status !== filter;
  });
}

function labelForFilter(filter) {
  if (filter === "all") return "All";
  const match = STATUS_OPTIONS.find((item) => item.id === filter);
  return match ? match.label : "All";
}

function updateCounts() {
  const counts = { queued: 0, scripted: 0, ready: 0, posted: 0 };
  VIDEOS.forEach((video) => { counts[statusOf(video.id)] += 1; });
  Object.keys(counts).forEach((key) => {
    const el = document.getElementById("count-" + key);
    const match = STATUS_OPTIONS.find((item) => item.id === key);
    if (el && match) el.textContent = counts[key] + " " + match.label;
  });
}

function syncIdeaPrompts() {
  const text = ideasPromptText();
  ["ideasPrompt", "vaultIdeas"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  });
}

function setStatus(id, value) {
  if (!STATUS_OPTIONS.some((item) => item.id === value)) return;
  statuses[id] = value;
  saveMap(STORAGE.status, statuses);
  const row = document.getElementById("idea-" + id);
  if (row) {
    row.dataset.status = value;
    row.hidden = ideaFilter !== "all" && ideaFilter !== value;
  }
  updateCounts();
  syncIdeaPrompts();
  const button = document.querySelector(`#day-${planDayFor(id)} .linkish`);
  if (button) {
    const video = videoById(id);
    button.textContent = value === "posted" ? "Video marked Posted" : "Mark " + video.short + " as Posted";
  }
}

function planDayFor(videoId) {
  const item = PLAN.find((day) => day.postId === Number(videoId));
  return item ? item.day : 0;
}

function onStudioVideo(id) {
  studioId = Number(id);
  const pack = document.getElementById("pack");
  if (!pack) return;
  pack.innerHTML = packHtml(videoById(studioId));
  refreshIcons();
}

function toggleAudit(videoId, key, checked) {
  const id = videoId + ":" + key;
  if (checked) audit[id] = true;
  else delete audit[id];
  saveMap(STORAGE.audit, audit);
  const row = document.getElementById("audit-" + videoId + "-" + key);
  if (row) row.classList.toggle("done", !!checked);
  const video = videoById(videoId);
  const pre = document.getElementById("auditPrompt");
  if (pre && video) pre.textContent = auditPromptText(video);
  const meter = document.getElementById("auditMeter");
  if (meter && video) {
    const done = auditItems(video).filter((item) => audit[video.id + ":" + item.key]).length;
    meter.textContent = done + " of " + auditItems(video).length + " checks done for this video.";
  }
}

function toggleDay(day, checked) {
  if (checked) days[day] = true;
  else delete days[day];
  saveMap(STORAGE.days, days);
  const row = document.getElementById("day-" + day);
  if (row) {
    row.classList.toggle("done", !!checked);
    const label = row.querySelector(".task-item");
    if (label) label.classList.toggle("done", !!checked);
  }
  refreshPlanMeta();
}

function refreshPlanMeta() {
  const done = PLAN.filter((item) => days[item.day]).length;
  const bar = document.getElementById("planBar");
  if (bar) bar.style.width = Math.round((done / PLAN.length) * 100) + "%";
  const label = document.getElementById("planDoneLabel");
  if (label) label.textContent = done + " of 30 days done";
  WEEKS.forEach((week) => {
    const el = document.getElementById("weekCount-" + week.id);
    if (!el) return;
    const posts = PLAN.filter((item) => item.week === week.id && item.postId && days[item.day]).length;
    el.textContent = posts + " of " + week.target + " posts done";
  });
  const card = document.getElementById("nextCard");
  if (card) card.innerHTML = nextCardInner();
  updateChrome();
}

function openNextInStudio() {
  const next = nextPostDay();
  if (next) studioId = next.postId;
  showView("studio");
}

function markVideoPosted(id) {
  setStatus(id, "posted");
  const button = document.querySelector(`#day-${planDayFor(id)} .linkish`);
  if (button) button.textContent = "Video marked Posted";
}

function onVaultVideo(id) {
  vaultVideoId = Number(id);
  const slot = document.getElementById("vaultSeo");
  if (!slot) return;
  slot.innerHTML = vaultSeoHtml(videoById(vaultVideoId));
  refreshIcons();
}

function copyFrom(id, btn) {
  const el = document.getElementById(id);
  if (!el || !btn) return;
  const text = el.textContent.replace(/\u00a0/g, " ");
  const finish = (ok) => {
    const label = btn.querySelector("span");
    if (!btn.dataset.label && label) btn.dataset.label = label.textContent;
    if (!ok) selectBox(id);
    if (label) label.textContent = ok ? "Copied" : "Press Ctrl+C";
    btn.classList.toggle("copied", ok);
    const icon = btn.querySelector("svg");
    if (icon) icon.outerHTML = `<i data-lucide="${ok ? "check" : "copy"}"></i>`;
    refreshIcons();
    window.setTimeout(() => {
      if (!btn.isConnected) return;
      if (label) label.textContent = btn.dataset.label || "Copy";
      btn.classList.remove("copied");
      const svg = btn.querySelector("svg");
      if (svg) svg.outerHTML = `<i data-lucide="copy"></i>`;
      refreshIcons();
    }, 1600);
  };

  const afterClipboardDenied = () => {
    if (fallbackCopy(text)) finish(true);
    else finish(false);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => finish(true)).catch(afterClipboardDenied);
    return;
  }
  afterClipboardDenied();
}

function selectBox(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function fallbackCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "0";
  area.style.width = "1px";
  area.style.height = "1px";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.focus();
  area.select();
  area.setSelectionRange(0, area.value.length);
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
  document.body.removeChild(area);
  return ok;
}

function boot() {
  statuses = loadMap(STORAGE.status);
  days = loadMap(STORAGE.days);
  audit = loadMap(STORAGE.audit);
  stack = loadStack();
  const hash = (location.hash || "").replace("#", "");
  showView(VIEWS.includes(hash) ? hash : "hub", true);
  window.addEventListener("hashchange", () => {
    const next = (location.hash || "").replace("#", "");
    if (next !== currentView) showView(next, true);
  });
  refreshIcons();
}

boot();
