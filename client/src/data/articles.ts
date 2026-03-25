export interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  content: string[];
}

export const articles: Article[] = [
  {
    id: "getting-started-guide",
    title: "Getting Started with ArchitectXpert: A Complete Guide",
    excerpt: "Everything you need to know to create your first AI-generated floor plan. From account setup to your first design export, this guide covers the entire workflow step by step.",
    category: "Tutorial",
    author: "Muhammad Muhaddas",
    date: "Mar 7, 2026",
    readTime: "8 min read",
    content: [
      "Welcome to ArchitectXpert — the AI-powered platform that transforms simple text descriptions into professional architectural floor plans. Whether you're a homeowner sketching out renovation ideas or a professional architect rapid-prototyping for clients, this guide will walk you through every step of the journey.",
      "Creating your account is the first step. Head to the sign-up page, enter your email and a secure password, and you're in. ArchitectXpert uses industry-standard encryption for passwords and session management, so your credentials are always safe. Once registered, you'll land on the main workspace — a clean, focused environment designed for effortless design.",
      "The workspace is built around a single idea: describe what you want, and the AI builds it. Start by entering your desired floor plan dimensions — width and depth in feet. Then specify the rooms you need. You might type something like '3 bedrooms, 2 bathrooms, open-concept kitchen and living area, home office, laundry room.' The AI parses your requirements and generates an optimized layout within seconds.",
      "Behind the scenes, our Neural Architecture Engine evaluates thousands of possible configurations. It considers room adjacency rules (kitchens near dining areas, bathrooms sharing plumbing walls), traffic flow patterns, natural light optimization, and standard building code constraints. The result is a layout that doesn't just look good — it works in practice.",
      "Once your floor plan is generated, you'll see it rendered as a detailed SVG on the canvas. Each room is labeled with its name and approximate dimensions. Color coding helps you distinguish between living spaces, wet areas, and utility rooms at a glance. You can zoom, pan, and inspect individual rooms.",
      "Exporting is straightforward. Click the download button to save your floor plan as an SVG file. SVG is a vector format, which means it scales to any size without losing quality — perfect for printing at architectural scale or importing into professional tools like AutoCAD, Revit, or SketchUp.",
      "The free Starter plan gives you up to 10 generations per month, which is plenty for exploring ideas and iterating on personal projects. If you need unlimited generations, advanced room types, or team collaboration features, the Pro and Enterprise plans have you covered.",
      "One important tip: the more specific your room requirements, the better the results. Instead of just saying 'big kitchen,' try 'open-concept kitchen with island, minimum 200 sq ft, adjacent to dining area.' The AI responds well to detailed instructions and produces more refined layouts as a result.",
    ],
  },
  {
    id: "ai-floor-plan-tips",
    title: "10 Pro Tips for Better AI Floor Plan Results",
    excerpt: "Learn how to write effective room requirements, choose optimal dimensions, and iterate on designs to get the most accurate and functional layouts from our AI engine.",
    category: "Tips & Tricks",
    author: "Huzaifa Tehseen",
    date: "Mar 5, 2026",
    readTime: "6 min read",
    content: [
      "Getting great results from ArchitectXpert's AI engine isn't about luck — it's about how you communicate your requirements. After analyzing thousands of successful generations, we've distilled the best practices into these ten essential tips that will dramatically improve your floor plan outputs.",
      "Tip 1: Start with realistic dimensions. A common mistake is specifying dimensions that are too small for the number of rooms requested. A 3-bedroom home typically needs at least 1,200 square feet. If you ask for 5 bedrooms in a 900 sq ft footprint, the AI will struggle to produce a functional layout. Use real-world references as your guide.",
      "Tip 2: Specify room adjacencies explicitly. Instead of listing rooms in isolation, describe relationships: 'master bedroom with en-suite bathroom,' 'kitchen open to living room,' 'laundry room adjacent to garage.' These cues help the AI optimize spatial flow and produce layouts that feel natural to navigate.",
      "Tip 3: Use the regenerate function liberally. Each generation produces a unique layout based on your specifications. If the first result isn't quite right, regenerate with the same parameters — you'll get a different configuration that might better suit your needs. Think of it as exploring a design space, not getting a single answer.",
      "Tip 4: Consider hallway and circulation space. The AI allocates space for hallways and corridors, but overly tight dimensions can result in cramped circulation paths. Add 10-15% extra to your total footprint to give the AI room to create comfortable passageways between rooms.",
      "Tip 5: Prioritize your must-have rooms. List your most important rooms first. The AI gives priority to earlier entries when resolving spatial conflicts. If a home office is more important than a guest bedroom, put it higher in your room list.",
      "Tip 6: Leverage room type keywords. The AI recognizes standard room types and applies appropriate sizing rules. 'Walk-in closet,' 'powder room,' 'breakfast nook,' 'mudroom' — these specific terms trigger optimized dimensions and placement logic that generic descriptions don't.",
      "Tip 7: Don't forget utility spaces. Storage rooms, mechanical rooms, and pantries are easy to overlook but essential in a functional home. Including them in your requirements produces more realistic, buildable floor plans.",
      "Tip 8: Experiment with different aspect ratios. A 40x30 rectangle produces a very different layout than a 50x24 rectangle with the same area. Changing the width-to-depth ratio can unlock better room arrangements and more efficient use of space.",
      "Tip 9: Review and iterate. The best floor plans come from multiple rounds of generation and refinement. Each time, adjust your requirements based on what worked and what didn't in the previous result. This iterative approach converges on an optimal design much faster than trying to get it perfect on the first attempt.",
      "Tip 10: Export and annotate. Once you have a layout you like, export it as SVG and open it in a vector editor. Add notes, measurements, and annotations. This creates a design brief that you can share with contractors, architects, or family members for feedback.",
    ],
  },
  {
    id: "understanding-spatial-design",
    title: "Understanding Spatial Design: Room Flow & Adjacency",
    excerpt: "Great architecture is about how spaces connect. Discover the principles behind room adjacency, traffic flow patterns, and how our AI optimizes spatial relationships automatically.",
    category: "Education",
    author: "Muhammad Muhaddas",
    date: "Mar 2, 2026",
    readTime: "10 min read",
    content: [
      "Architecture is not just about individual rooms — it's about how those rooms relate to each other. The difference between a house that feels intuitive and one that feels awkward often comes down to spatial relationships: which rooms are adjacent, how traffic flows between them, and whether the overall layout supports daily living patterns.",
      "Room adjacency is the foundation of good floor plan design. Certain rooms naturally belong together: kitchens and dining areas, master bedrooms and en-suite bathrooms, living rooms and entryways. These pairings reduce unnecessary movement, minimize hallway space, and create a sense of logical progression through the home.",
      "Traffic flow describes the paths people take as they move through a space. In a well-designed home, primary traffic routes — from the entrance to the kitchen, from bedrooms to bathrooms — are short, direct, and don't require passing through other functional spaces. The AI evaluates traffic patterns as a core optimization criterion.",
      "Zoning is another critical concept. Homes are typically divided into public zones (living room, dining room, kitchen), private zones (bedrooms, bathrooms), and service zones (laundry, garage, storage). Good design keeps these zones distinct while providing smooth transitions between them. A guest shouldn't have to walk through the master bedroom wing to reach the powder room.",
      "The concept of 'served' and 'servant' spaces, introduced by architect Louis Kahn, remains relevant. Served spaces are the primary living areas where activities happen. Servant spaces — closets, mechanical rooms, corridors — support the served spaces. Effective floor plans maximize served space while efficiently integrating servant spaces.",
      "Natural light plays a crucial role in room placement. Bedrooms benefit from east-facing windows for morning light. Living areas thrive with south-facing exposure for consistent daylight. Kitchens need good natural illumination for food preparation. Our AI considers cardinal orientation when optimizing room placement.",
      "Open floor plans have dominated modern residential design, but they're not universally superior. The trend toward 'broken-plan' living — open areas with subtle divisions like partial walls, level changes, or material transitions — offers the social benefits of open plans while maintaining acoustic privacy and visual variety.",
      "Circulation efficiency is measured by the ratio of corridor space to total floor area. Professional architects aim for 10-15% corridor allocation. Our AI targets this range, creating efficient circulation networks that connect all rooms without wasting square footage on unnecessary hallways.",
      "When you use ArchitectXpert, all of these principles are built into the generation engine. The AI doesn't just place rooms randomly — it evaluates adjacency scores, traffic flow efficiency, zone separation, and circulation ratios to produce layouts that embody decades of architectural knowledge.",
    ],
  },
  {
    id: "modern-home-layouts",
    title: "Modern Home Layouts: Trends Shaping 2026 Architecture",
    excerpt: "From flexible multi-use spaces to biophilic design integration, explore the emerging trends in residential architecture and how AI tools are accelerating their adoption.",
    category: "Industry",
    author: "Huzaifa Tehseen",
    date: "Feb 28, 2026",
    readTime: "7 min read",
    content: [
      "Residential architecture is evolving faster than ever. The convergence of remote work, sustainability consciousness, and technological innovation is reshaping how we think about home design. Here are the trends defining 2026 and how AI-powered tools like ArchitectXpert are helping architects and homeowners embrace them.",
      "The home office has graduated from a 'nice-to-have' to a non-negotiable requirement. But 2026's home offices go beyond a desk in a spare bedroom. Dedicated work zones with acoustic isolation, proper ventilation, and natural light are becoming standard. Many homeowners now request two home offices — one for each partner — with separate entrances for video call privacy.",
      "Flexible multi-use spaces are replacing single-purpose rooms. A guest bedroom that doubles as a yoga studio, a dining room that converts into a homework zone, a garage that transforms into a workshop — these hybrid spaces maximize utility per square foot. AI floor plan generators excel here because they can optimize room dimensions for multiple use cases simultaneously.",
      "Biophilic design — integrating natural elements into built environments — has moved from commercial architecture into residential spaces. Indoor gardens, living walls, courtyards, and abundant natural light are in high demand. Floor plans now frequently include dedicated garden rooms, sunrooms, and interior courtyards that blur the boundary between inside and outside.",
      "Multigenerational living is surging. Accessory dwelling units (ADUs), in-law suites, and connected-but-separate living quarters allow extended families to share a property while maintaining independence. ArchitectXpert users increasingly generate multi-unit layouts on single footprints, reflecting this demographic shift.",
      "Wellness rooms are a new category entirely. Dedicated spaces for meditation, exercise, sauna, or cold plunge therapy are appearing in floor plans at every price point. These rooms have specific dimensional and ventilation requirements that benefit from AI-optimized placement within the broader layout.",
      "Sustainability drives design decisions at every level. Compact footprints reduce material usage and energy consumption. Efficient layouts minimize wasted space. Strategic room placement reduces heating and cooling loads. AI tools accelerate sustainable design by optimizing these factors computationally, producing layouts that would take human designers hours to refine manually.",
      "The kitchen continues to evolve as the social center of the home. Double islands, walk-in pantries, butler's pantries, and integrated dining counters reflect how cooking has become a communal activity rather than a solitary chore. The most requested kitchen feature in 2026? A 'mess kitchen' — a secondary prep space hidden from the main living area for post-party cleanup.",
    ],
  },
  {
    id: "export-workflow",
    title: "From AI to AutoCAD: The Complete Export Workflow",
    excerpt: "A practical walkthrough of exporting your AI-generated floor plans into professional tools like AutoCAD, Revit, and SketchUp for further refinement and construction documentation.",
    category: "Tutorial",
    author: "Muhammad Muhaddas",
    date: "Feb 24, 2026",
    readTime: "5 min read",
    content: [
      "ArchitectXpert generates beautiful floor plans, but for many users the real work begins after export. Whether you're a professional architect preparing construction documents or a homeowner sharing plans with a contractor, understanding the export workflow ensures your AI-generated designs transition smoothly into professional tools.",
      "The primary export format is SVG (Scalable Vector Graphics). SVG is ideal for architectural work because it's resolution-independent — your floor plan looks crisp whether printed on letter paper or a 36x48 architectural sheet. Every line, label, and dimension in the exported file is a discrete vector element that can be individually edited.",
      "To export, simply click the download button in the workspace toolbar after generating a floor plan. The SVG file is saved to your local machine instantly. The file is structured with logical groupings: walls on one layer, room labels on another, dimensions on a third. This layer organization makes it easy to isolate elements in downstream tools.",
      "Importing into AutoCAD is straightforward. Use the 'Import' command (or drag and drop the SVG file into the drawing area). AutoCAD converts SVG elements to native entities — lines become AutoCAD lines, text becomes AutoCAD text. You may need to scale the import to match your drawing units (the export uses feet as the base unit).",
      "For Revit users, the workflow involves importing the SVG as an underlay. Place it on a reference plane at the correct scale, then trace over it using Revit's wall, door, and window tools. This hybrid approach gives you the speed of AI generation with the BIM-ready precision of Revit's native elements.",
      "SketchUp handles SVG imports natively. Import the file, and SketchUp converts the 2D floor plan into editable geometry. From there, you can use the Push/Pull tool to extrude walls to height, add 3D elements like furniture and fixtures, and create compelling visualizations for client presentations.",
      "For quick sharing without professional software, the SVG can be opened in any web browser, converted to PDF using free online tools, or imported into presentation software like PowerPoint or Google Slides. This makes it easy to share floor plans with non-technical stakeholders.",
      "A pro tip: before exporting, generate multiple variations of your floor plan with the same requirements. Export your top 2-3 favorites, then compare them side by side in your professional tool. The AI produces different layouts each time, and having options gives you and your clients more to work with during the design review phase.",
    ],
  },
];

export const categoryColors: Record<string, string> = {
  Tutorial: "text-accent-blue bg-accent-blue/10 border-accent-blue/20",
  "Tips & Tricks": "text-green-400 bg-green-400/10 border-green-400/20",
  Education: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  Industry: "text-accent-gold bg-accent-gold/10 border-accent-gold/20",
};
