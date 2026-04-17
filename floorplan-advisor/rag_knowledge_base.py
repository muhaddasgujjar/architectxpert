"""
ArchitectXpert RAG Knowledge Base
==================================
Curated architecture knowledge chunks for retrieval-augmented generation.
Each chunk has: id, category, tags, content.
The retriever uses TF-IDF similarity to find the most relevant chunks.
"""

KNOWLEDGE_CHUNKS = [

    # ─────────────────────────────────────────────────────────────
    # FLOORPLAN & LAYOUT DESIGN
    # ─────────────────────────────────────────────────────────────
    {
        "id": "fp_001",
        "category": "floorplan_design",
        "tags": ["floorplan", "layout", "design", "bedroom", "living", "zoning"],
        "content": (
            "Effective floor plan design starts with zoning: group spaces by function. "
            "The 'public zone' (living room, dining, kitchen) should face the main entrance and be easily accessible. "
            "The 'private zone' (bedrooms, bathrooms) should be set back for privacy. "
            "The 'service zone' (laundry, storage, garage) should have direct outdoor access. "
            "In Pakistani homes, a separate guest sitting area near the entrance is culturally important. "
            "Avoid placing bathrooms adjacent to kitchens without proper shielding."
        ),
    },
    {
        "id": "fp_002",
        "category": "floorplan_design",
        "tags": ["floorplan", "circulation", "corridor", "flow", "efficiency"],
        "content": (
            "Circulation efficiency is key to a good floor plan. Corridors should be kept under 15% of total floor area. "
            "The optimal corridor width is 3.5–4 feet for residential and 5 feet for commercial. "
            "A central corridor plan reduces wasted space compared to single-loaded layouts. "
            "Use a 'broken-plan' approach: instead of open-plan or fully closed rooms, use partial walls and level changes to define spaces while maintaining connection. "
            "Dead-end corridors longer than 20 feet should be avoided for fire egress."
        ),
    },
    {
        "id": "fp_003",
        "category": "floorplan_design",
        "tags": ["floorplan", "natural light", "ventilation", "orientation", "windows"],
        "content": (
            "Orient the building so that living spaces face south or southeast in Pakistan for good winter sun. "
            "Bedrooms on the north side stay cooler in summer. "
            "Cross-ventilation requires windows on at least two opposite or adjacent walls. "
            "Window-to-floor ratio should be 10–15% for living rooms and 8–10% for bedrooms. "
            "Deep overhangs (chajjas) of 2–3 feet on south and west facades block summer sun while allowing winter sun. "
            "Skylights over staircases and central corridors improve natural light deep in the plan."
        ),
    },
    {
        "id": "fp_004",
        "category": "floorplan_design",
        "tags": ["floorplan", "kitchen", "layout", "work triangle", "design"],
        "content": (
            "The kitchen work triangle — sink, stove, and refrigerator — should form a triangle with each side between 4 and 9 feet. "
            "The total perimeter of the work triangle should not exceed 26 feet or be less than 12 feet. "
            "L-shaped and U-shaped kitchens are most efficient. Island kitchens work best when the kitchen is at least 12 feet wide. "
            "Allow at least 42 inches of clearance between facing counters and cabinets. "
            "In Pakistani homes, provide a separate utility area for washing dishes and a 'dirty kitchen' for heavy cooking to keep the main kitchen clean."
        ),
    },
    {
        "id": "fp_005",
        "category": "floorplan_design",
        "tags": ["floorplan", "bathroom", "toilet", "design", "dimensions"],
        "content": (
            "Minimum bathroom dimensions: full bath (toilet + sink + tub/shower) = 5 × 8 feet. "
            "Half bath (toilet + sink only) = 3 × 6 feet. "
            "Wet areas should be located above each other on different floors to simplify plumbing stacks. "
            "Provide at least one bathroom per 2 bedrooms in residential design. "
            "Master bathrooms should have double vanity, separate shower and bath where budget allows. "
            "Ensure 15 inches clearance from toilet centerline to any side wall or obstruction."
        ),
    },
    {
        "id": "fp_006",
        "category": "floorplan_design",
        "tags": ["bedroom", "dimensions", "master bedroom", "size", "design"],
        "content": (
            "Minimum bedroom sizes: single bedroom = 100 sq ft, double bedroom = 120 sq ft, master bedroom = 180–200 sq ft. "
            "Pakistan Building Code 2021 mandates minimum 120 sq ft for habitable rooms. "
            "A master bedroom suite should include a walk-in wardrobe (minimum 40 sq ft) and attached bathroom (minimum 50 sq ft). "
            "Place bedroom doors so they don't open directly into the sleeping area or face the bed. "
            "Wardrobes should be 24 inches deep; built-in wardrobes save space vs freestanding furniture."
        ),
    },
    {
        "id": "fp_007",
        "category": "floorplan_design",
        "tags": ["staircase", "stairs", "design", "dimensions", "rise", "run"],
        "content": (
            "Standard stair dimensions: riser height 7–7.5 inches, tread depth 10–11 inches, stair width minimum 36 inches residential / 44 inches commercial. "
            "The rule: 2×riser + tread = 24–25 inches. "
            "A comfortable stair pitch is 30–35 degrees. "
            "Minimum headroom clearance above stairs is 6.8 feet (2.05 m). "
            "In Pakistan, straight run stairs are most common; L-shaped stairs suit corner locations. "
            "Winding stairs save space but compromise safety; avoid in family homes with elderly occupants."
        ),
    },
    {
        "id": "fp_008",
        "category": "floorplan_design",
        "tags": ["parking", "garage", "driveway", "car", "dimensions"],
        "content": (
            "Single car garage minimum: 10 × 20 feet (with door). "
            "Double car garage: 20 × 20 feet minimum, 22 × 22 feet preferred. "
            "Minimum driveway width: 10 feet for single lane, 18–20 feet for double lane. "
            "Turning radius for a standard car: 15–18 feet. "
            "In Pakistani urban plots, space is premium; a covered car porch with a 10 × 18 foot clear area is a common space-saving solution. "
            "Allow 24 feet of straight run for a car to fully exit and turn."
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # CONSTRUCTION MATERIALS
    # ─────────────────────────────────────────────────────────────
    {
        "id": "mat_001",
        "category": "materials",
        "tags": ["concrete", "cement", "RCC", "structure", "strength"],
        "content": (
            "Reinforced concrete (RCC) is the dominant structural system in Pakistan. "
            "Standard mix design: M20 grade (20 MPa) for slabs and beams, M25 for columns and foundations. "
            "Water-cement ratio should not exceed 0.45 for structural concrete. "
            "Use OPC 53 grade cement (Lucky, DG Khan, Bestway) for structural work. "
            "Cube strength must be tested at 7 days (70% of 28-day strength expected) and 28 days. "
            "Curing for minimum 14 days with water is critical for achieving design strength. "
            "Cover to steel reinforcement: 25 mm for slabs, 40 mm for columns and beams, 50 mm for foundation."
        ),
    },
    {
        "id": "mat_002",
        "category": "materials",
        "tags": ["brick", "masonry", "wall", "clay", "burnt brick"],
        "content": (
            "First-class burnt clay bricks are the standard walling material in Pakistan. "
            "Standard size: 9 × 4.5 × 3 inches. Compressive strength: minimum 3,500 psi (24 MPa). "
            "Cost: PKR 12,000–18,000 per 1,000 bricks depending on quality and location. "
            "A 9-inch (full brick) wall provides good thermal mass and sound insulation. "
            "A 4.5-inch (half brick) wall is used for internal partitions. "
            "Limit brick wall height to 3 meters without lateral support. "
            "AAC (Autoclaved Aerated Concrete) blocks are a modern alternative: 30% lighter, better thermal insulation, faster laying, but 20–30% more expensive."
        ),
    },
    {
        "id": "mat_003",
        "category": "materials",
        "tags": ["steel", "reinforcement", "rebar", "structure", "Grade 60"],
        "content": (
            "Steel reinforcement grades in Pakistan: Grade 40 (yield strength 280 MPa) and Grade 60 (yield strength 420 MPa). "
            "Grade 60 is preferred — it reduces steel quantity by 15% versus Grade 40 for the same structural capacity. "
            "Common bar diameters: 10 mm, 12 mm, 16 mm, 20 mm, 25 mm. "
            "Amreli, Mughal, ISL Steel, and Ittefaq Steel are major Pakistani producers. "
            "Current market price: PKR 260,000–290,000 per metric ton (varies with global steel prices). "
            "Always use deformed (ribbed) bars for RCC work — never smooth bars for structural elements. "
            "Check for mill certificates and perform bend tests on-site for quality assurance."
        ),
    },
    {
        "id": "mat_004",
        "category": "materials",
        "tags": ["flooring", "tiles", "marble", "granite", "ceramic", "finish"],
        "content": (
            "Flooring options in Pakistan from economy to luxury: "
            "1. Ceramic tiles — PKR 60–120/sq ft, good for bathrooms and kitchens, slip-resistant options available. "
            "2. Porcelain tiles — PKR 120–300/sq ft, harder wearing, lower water absorption (<0.5%), ideal for high-traffic areas. "
            "3. Local marble (Ziarat White, Badal, Verona) — PKR 80–200/sq ft supply, excellent thermal performance in Pakistan's climate. "
            "4. Imported marble (Italian Carrara, Spanish Crema Marfil) — PKR 400–1,200/sq ft. "
            "5. Engineered wood/laminate — PKR 150–400/sq ft, comfortable underfoot, not for wet areas. "
            "Use 600×600 mm or 600×1200 mm format tiles for large rooms — fewer grout lines look premium."
        ),
    },
    {
        "id": "mat_005",
        "category": "materials",
        "tags": ["insulation", "thermal", "heat", "wall insulation", "roof insulation"],
        "content": (
            "Thermal insulation is critical in Pakistan's extreme climate. "
            "For roofs: extruded polystyrene (XPS) board 50–75 mm thick under screed reduces cooling load by 25–35%. "
            "For walls: cavity wall construction with 50 mm air gap, or AAC blockwork, or EPS board externally. "
            "Reflective roof coatings (SRI > 78) reduce rooftop temperatures by 15–20°C. "
            "Double-glazed windows with Low-E coating reduce heat gain by 40% vs single glass. "
            "R-value targets: roof minimum R-20, walls minimum R-10 for Pakistani climate zones. "
            "Polyurethane spray foam provides highest R-value (~R-6 per inch) but higher cost."
        ),
    },
    {
        "id": "mat_006",
        "category": "materials",
        "tags": ["waterproofing", "seepage", "roof", "basement", "water"],
        "content": (
            "Waterproofing is one of the most critical aspects of construction in Pakistan's monsoon climate. "
            "For roofs: bituminous torch-on membrane (4 mm) or liquid-applied polyurethane membrane over screed. "
            "Dr. Fixit and Sika are the most trusted brands. Apply in two coats at 90° to each other. "
            "For foundations and basements: crystalline waterproofing (Dr. Fixit Krystol) applied to concrete. "
            "For bathrooms: cement-based flexible waterproofing slurry (Sika-1) applied before tiling. "
            "Plinth protection: concrete apron 1.2 m wide slope away from building at 1:50 gradient. "
            "Always test water-tightness by flooding roof for 24 hours before final screed."
        ),
    },
    {
        "id": "mat_007",
        "category": "materials",
        "tags": ["paint", "finish", "exterior", "interior", "weather shield"],
        "content": (
            "Interior paints: vinyl emulsion for walls (plastic paint), oil-based enamel for woodwork and doors. "
            "Exterior paints: must be weather-resistant; use acrylic or elastomeric (Weathershield) finish. "
            "Atlas, Berger, and ICI are the top Pakistani paint brands. "
            "Surface preparation is 80% of a good paint job: fill cracks, apply two coats of primer. "
            "For damp-prone areas (bathrooms, ground-floor walls), use anti-fungal paint additive. "
            "Light colors (white, cream) on exterior facades reduce solar heat absorption by up to 30%. "
            "Cost: good quality interior paint PKR 80–150/sq ft applied; exterior PKR 70–120/sq ft."
        ),
    },
    {
        "id": "mat_008",
        "category": "materials",
        "tags": ["wood", "timber", "doors", "windows", "joinery"],
        "content": (
            "Common woods in Pakistani construction: "
            "Deodar (cedar) — premium, naturally termite-resistant, used for structural beams in traditional architecture. "
            "Keekar (Acacia) — hard, dense, used for doorsills and exterior joinery. "
            "Sheesham (Rosewood) — popular for furniture and door frames, beautiful grain. "
            "Imported pine — common for door shutters and windows, requires treatment. "
            "All wood must be seasoned (moisture content < 15%) before use. "
            "Apply boric acid termite treatment before installation. "
            "Engineered wood (MDF, plywood) for interior cabinetry — more dimensionally stable than solid wood in Pakistan's humidity swings."
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # STRUCTURAL ENGINEERING
    # ─────────────────────────────────────────────────────────────
    {
        "id": "str_001",
        "category": "structural",
        "tags": ["foundation", "footing", "soil", "structural", "bearing capacity"],
        "content": (
            "Foundation type depends on soil bearing capacity (SBC). "
            "Sandy soils (common near rivers in Punjab): SBC 100–150 kN/m², use strip footings with wide base or raft foundation. "
            "Stiff clay (Islamabad region): SBC 150–200 kN/m², isolated column footings work. "
            "Rock (Peshawar hills): SBC 500+ kN/m², shallow footings sufficient. "
            "For low SBC soils, use raft (mat) foundation or pile foundation. "
            "Minimum foundation depth: 1.2 m below finished grade to avoid frost heave and topsoil movement. "
            "Always conduct soil investigation (bore holes to 3× column load depth) before finalizing foundation type."
        ),
    },
    {
        "id": "str_002",
        "category": "structural",
        "tags": ["column", "beam", "slab", "RCC frame", "structural system"],
        "content": (
            "For typical Pakistani residential construction (up to G+3): "
            "Column sizes: minimum 12×12 inches (305×305 mm) for 2 stories, 14×14 inches for 3–4 stories. "
            "Main beam depth: typically span/12 to span/15, width of beam = depth/2. "
            "Slab thickness: span/25 for simply supported, span/28 for continuous slabs (minimum 5 inches). "
            "Column grid: 15–20 feet (4.5–6 m) is economical for residential, up to 30 feet for commercial open-plan. "
            "Use moment-resisting frame (MRF) system in seismic zones 3 and 4. "
            "Drop panels or flat-plate slabs can be used for floor-to-floor heights requiring maximum clearance."
        ),
    },
    {
        "id": "str_003",
        "category": "structural",
        "tags": ["seismic", "earthquake", "structural", "load", "zone", "Pakistan"],
        "content": (
            "Pakistan's seismic zonation per PEC: Zone 1 (low risk), Zone 2A/2B (moderate), Zone 3 (high — Islamabad, Rawalpindi), Zone 4 (very high — Peshawar, Quetta). "
            "In seismic zones 3 and 4, use ductile detailing: 135° hook stirrups, closely spaced stirrups in beam-column joints, shear walls in cores. "
            "Structural irregularities (soft stories, re-entrant corners, mass asymmetry) are especially dangerous in earthquakes. "
            "PEC Building Code Chapter 21 governs seismic-resistant construction. "
            "For Zone 3/4: response modification factor R = 5 (special moment frame), base shear = (Cs × W). "
            "Never add extra floors to an existing building without seismic re-analysis."
        ),
    },
    {
        "id": "str_004",
        "category": "structural",
        "tags": ["loads", "structural", "dead load", "live load", "wind load"],
        "content": (
            "Structural loads in building design: "
            "Dead loads: self-weight of structure (concrete = 2,400 kg/m³, brick = 1,800 kg/m³), floor finishes, partitions. "
            "Live loads: residential = 2 kN/m² (40 psf), offices = 3 kN/m² (60 psf), rooftop garden = 5 kN/m². "
            "Wind loads: determined by site exposure and local wind speed maps per ASCE 7 adapted for Pakistan. "
            "Water tank load on roof: water weighs 1,000 kg/m³; a 1,000-liter tank = 1 metric ton point load. "
            "Partition walls add 1–1.5 kN/m² as equivalent live load. "
            "All loads must be factored per code (1.2×DL + 1.6×LL for strength design)."
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # BUILDING SERVICES (MEP)
    # ─────────────────────────────────────────────────────────────
    {
        "id": "mep_001",
        "category": "building_services",
        "tags": ["plumbing", "water supply", "drainage", "pipes", "CPVC", "PPR"],
        "content": (
            "Water supply pipes in Pakistan: CPVC (Chlorinated PVC) or PPR (Polypropylene Random) for hot and cold water inside buildings — both resist corrosion and scale. "
            "GI (galvanized iron) pipe is still used for mains supply but corrodes within 10–15 years. "
            "Drain pipes: uPVC 110 mm for WC branches, 50 mm for basin and shower, 160 mm for main soil stack. "
            "Minimum slope for drainage: 1:80 for 110 mm pipes, 1:100 for 160 mm pipes. "
            "Two-pipe system (separate soil and waste pipes) prevents foul gases from entering fixtures. "
            "Roof water tank capacity: 45 liters per person per day. For a 5-person family: 250–300 liters minimum. "
            "Underground water tank (UGT): sized for 3-day storage = 400–500 liters per person."
        ),
    },
    {
        "id": "mep_002",
        "category": "building_services",
        "tags": ["electrical", "wiring", "load", "DB", "WAPDA", "Pakistan"],
        "content": (
            "Electrical system basics for Pakistani buildings: "
            "Supply: 220V single-phase (2-wire) for small residential, 380V three-phase (4-wire) for large buildings. "
            "Wiring: use 2.5 mm² copper wire for power circuits, 1.5 mm² for lighting. Pakistan standards use PVC-insulated cables. "
            "Distribution Board (DB): use MCBs (Miniature Circuit Breakers) — never rewirable fuses. Add RCCB (30 mA) for bathroom and outdoor circuits. "
            "Load estimation: 1 kW per 100 sq ft of residential area as a rough guide. "
            "UPS provision: pre-install conduit for UPS/inverter backup in every room. "
            "WAPDA connection: single-phase up to 5 kW, three-phase for 5–50 kW demand. "
            "Solar panels: 5 kW system (20 panels) produces ~20 kWh/day, covering most household needs."
        ),
    },
    {
        "id": "mep_003",
        "category": "building_services",
        "tags": ["HVAC", "air conditioning", "AC", "ventilation", "cooling"],
        "content": (
            "AC sizing rule of thumb: 1 ton (12,000 BTU) per 400–500 sq ft in Pakistan's climate. "
            "Split ACs (inverter type) are most efficient: look for 5-star energy rating (EER > 3.0). "
            "Haier, Gree, Dawlance, and Kenwood offer reliable products at PKR 80,000–250,000 per ton. "
            "For large buildings (10+ rooms), consider VRF (Variable Refrigerant Flow) systems — 30% more efficient than multiple splits. "
            "Ventilation: provide minimum 0.35 air changes per hour (ACH) in all habitable rooms. Kitchen exhaust: 15 ACH minimum. Bathroom exhaust: 8 ACH. "
            "Proper insulation reduces AC capacity requirement by 20–30%. "
            "Install AC outdoor units on shaded north or east walls for improved efficiency."
        ),
    },
    {
        "id": "mep_004",
        "category": "building_services",
        "tags": ["solar", "renewable energy", "solar panels", "solar system", "Pakistan"],
        "content": (
            "Solar energy in Pakistan context: "
            "Pakistan receives 5–7 peak sun hours per day — excellent solar potential. "
            "On-grid (net metering) system: sells excess power back to WAPDA at PKR 19.61/kWh. "
            "Off-grid + battery: essential for areas with heavy load-shedding (8–12 hrs). Lithium LiFePO4 batteries are preferred (10-year life). "
            "System sizing: 1 kW solar = 4–5 kWh/day generation. A 5 kW system covers a medium house fully. "
            "Cost: PKR 150,000–200,000 per kW installed (on-grid), PKR 250,000–350,000 per kW with battery backup. "
            "Payback period: 4–6 years for on-grid systems. "
            "Orientation: south-facing panels at 25–30° tilt angle optimal for Pakistan."
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # BUILDING CODES & REGULATIONS
    # ─────────────────────────────────────────────────────────────
    {
        "id": "code_001",
        "category": "building_codes",
        "tags": ["building code", "Pakistan", "PBC", "regulations", "approval"],
        "content": (
            "Pakistan Building Code (PBC) 2021 is the primary national standard. "
            "Key requirements: plot coverage maximum 60–75% (varies by local authority), height limits per zoning. "
            "Floor Area Ratio (FAR): residential 0.75–1.5 (for single story), can go to 3.5 with approvals for multi-story. "
            "Minimum room heights: habitable rooms 9 feet (2.75 m), bathrooms 7.5 feet (2.3 m), kitchens 8.5 feet (2.6 m). "
            "Setbacks: typically front 10–15 ft, sides 3–5 ft, rear 5–8 ft (varies by plot size and city). "
            "Structural drawings must be approved by a PEC-registered structural engineer. "
            "Completion certificate required from local authority before occupancy."
        ),
    },
    {
        "id": "code_002",
        "category": "building_codes",
        "tags": ["fire safety", "fire code", "egress", "sprinkler", "exit"],
        "content": (
            "Fire safety requirements in Pakistan (SBCA guidelines): "
            "Buildings over 3 floors require automatic fire sprinkler system (NFPA 13). "
            "Minimum 2 exits (including one fire escape) for floors above ground in commercial buildings. "
            "Maximum travel distance to exit: 60 m (200 ft) in sprinklered buildings, 45 m (150 ft) without. "
            "Fire exit doors must open in the direction of egress travel with 90-minute fire rating. "
            "Stairwell must be pressurized (positive pressure) in buildings over 6 floors. "
            "Fire extinguisher: minimum one 4.5 kg ABC dry powder extinguisher per 100 sq m, mounted within 30 m of any point. "
            "Emergency lighting: full building backup lighting for minimum 90 minutes."
        ),
    },
    {
        "id": "code_003",
        "category": "building_codes",
        "tags": ["accessibility", "disability", "ramp", "universal design", "wheelchair"],
        "content": (
            "Accessibility requirements: public buildings in Pakistan should comply with universal design principles. "
            "Wheelchair ramp gradient: maximum 1:12 (one unit rise per 12 units horizontal). "
            "Minimum ramp width: 36 inches (900 mm) clear. Handrails on both sides for ramps over 6 feet long. "
            "Accessible toilet: 5 × 5 foot turning radius clear, grab bars on walls, toilet height 17–19 inches. "
            "Minimum door clear width for wheelchair access: 32 inches (815 mm). "
            "Elevator required in commercial buildings over 3 floors. "
            "Tactile paving at hazard zones and pedestrian crossings."
        ),
    },
    {
        "id": "code_004",
        "category": "building_codes",
        "tags": ["approval", "LDA", "CDA", "SBCA", "permit", "NOC", "drawings"],
        "content": (
            "Building approval process in major Pakistani cities: "
            "Lahore (LDA): submit architectural + structural drawings, site plan, ownership documents. Processing: 2–4 months. Fee: PKR 50–500 per sq yd of covered area. "
            "Islamabad (CDA): stricter bylaws, especially in residential sectors. Allow 3–5 months for approval. "
            "Karachi (SBCA): submit to Sindh Building Control Authority. Includes NOC from KDA or Town Municipal Administration. "
            "Other cities: processed by local Development Authority or Town Committee (TC). "
            "Common required documents: title deed, location plan, site plan, architectural drawings (all floors, elevations, sections), structural drawings, NOC from utility companies. "
            "Violation of approved plan can result in demolition notice."
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # SUSTAINABILITY & GREEN BUILDING
    # ─────────────────────────────────────────────────────────────
    {
        "id": "sus_001",
        "category": "sustainability",
        "tags": ["sustainability", "green building", "LEED", "energy efficiency", "eco"],
        "content": (
            "Green building certification applicable in Pakistan: LEED (US Green Building Council), implemented by Green Building Council Pakistan. "
            "LEED categories: Sustainable Sites, Water Efficiency, Energy & Atmosphere, Materials & Resources, Indoor Environmental Quality, Innovation. "
            "Even without formal certification, applying green principles reduces operating costs significantly. "
            "Key strategies: passive cooling (orientation, shading, cross-ventilation), active systems (solar panels, heat pumps), water conservation (rainwater harvesting, grey water reuse), and sustainable materials (recycled content, locally sourced). "
            "A net-zero energy building generates as much energy as it consumes annually — achievable in Pakistan with solar."
        ),
    },
    {
        "id": "sus_002",
        "category": "sustainability",
        "tags": ["rainwater harvesting", "water conservation", "grey water", "recycling"],
        "content": (
            "Water conservation strategies for Pakistan: "
            "Rainwater harvesting: collect roof runoff in underground tanks. Lahore receives ~600mm annual rainfall — a 200 sq m roof can collect 120,000 liters/year. "
            "First-flush diverter: discard first 1–2 mm of rainfall (which washes dust); capture the rest. "
            "Grey water recycling: reuse sink and shower water (after light filtration) for toilet flushing and garden irrigation — saves 30–40% of total water use. "
            "Low-flow fixtures: install 6-liter flush WCs (vs old 13-liter), aerated faucets (6 LPM vs 12 LPM), and low-flow showerheads (8 LPM vs 15 LPM). "
            "Drip irrigation for gardens reduces water use by 60% vs surface irrigation."
        ),
    },
    {
        "id": "sus_003",
        "category": "sustainability",
        "tags": ["passive design", "cooling", "natural ventilation", "courtyard", "vernacular"],
        "content": (
            "Passive design strategies for Pakistan's hot climate: "
            "Courtyard design (haveli concept): central courtyards act as thermal chimneys — hot air rises and exits, drawing cool air from shaded lower openings. "
            "Wind towers (bad-gir/malqaf): traditional Persian-inspired devices that channel prevailing winds down into the building. "
            "Underground spaces: earth temperature at 3m depth remains 18–22°C year-round — use for storage or server rooms without air conditioning. "
            "Thermal mass: thick concrete or brick walls absorb daytime heat and release it at night when temperatures drop. Best for dry climates (Multan, Quetta). "
            "Green roofs: planted roofs reduce urban heat island effect and provide natural insulation."
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # COST ESTIMATION
    # ─────────────────────────────────────────────────────────────
    {
        "id": "cost_001",
        "category": "cost_estimation",
        "tags": ["cost", "estimate", "budget", "construction cost", "Pakistan"],
        "content": (
            "Construction cost ranges in Pakistan (2024–2025 market): "
            "Economy finish residential: PKR 2,200–2,800 per sq ft (covered area). "
            "Standard finish residential: PKR 2,800–3,800 per sq ft. "
            "Premium finish residential: PKR 4,000–5,500 per sq ft. "
            "Luxury finish residential: PKR 6,000–10,000+ per sq ft. "
            "Cost breakdown for standard residential: Structure 35%, Finishing 25%, Mechanical & Electrical 20%, External works 12%, Fees & contingency 8%. "
            "Add 15% contingency for material price escalation (steel and cement fluctuate ±25% annually). "
            "Labour costs are 25–35% of total construction cost in Pakistan."
        ),
    },
    {
        "id": "cost_002",
        "category": "cost_estimation",
        "tags": ["cost", "material prices", "steel", "cement", "prices", "current"],
        "content": (
            "Current material prices in Pakistan (2024–2025 approximate): "
            "OPC Cement (50 kg bag): PKR 1,100–1,400 depending on brand and location. "
            "Steel reinforcement (Grade 60): PKR 260,000–295,000 per metric ton. "
            "Sand (Ravi silt): PKR 50–80 per cft. "
            "Gravel/crush aggregate: PKR 60–90 per cft. "
            "First-class bricks: PKR 12,000–18,000 per 1,000 nos. "
            "Marble (Ziarat White local): PKR 80–150 per sq ft supply. "
            "Ceramic floor tiles (basic): PKR 55–90 per sq ft. "
            "PVC doors: PKR 8,000–15,000 per unit. Wooden doors: PKR 15,000–60,000 per unit. "
            "Note: prices change frequently — always get current market rates from local suppliers."
        ),
    },
    {
        "id": "cost_003",
        "category": "cost_estimation",
        "tags": ["cost saving", "value engineering", "budget", "reduce cost"],
        "content": (
            "Cost-saving strategies in Pakistani construction: "
            "1. Use Grade 60 steel instead of Grade 40 — saves 10–15% on steel quantity. "
            "2. Optimize column grid — fewer spans means less steel and formwork. "
            "3. Flat roof (RCC slab) instead of pitched roof — cheaper to build and maintain in Pakistan's dry climate. "
            "4. Use locally manufactured tiles instead of imported — same visual quality at 40% less cost. "
            "5. Cast-in-situ concrete vs precast — precast is faster but has higher upfront cost; use cast-in-situ for custom sizes. "
            "6. Bulk purchase materials at start of project to avoid price escalation. "
            "7. AAC blocks instead of brick — faster laying (fewer units), saves on labour and mortar."
        ),
    },
    {
        "id": "cost_004",
        "category": "cost_estimation",
        "tags": ["timeline", "construction schedule", "duration", "phases"],
        "content": (
            "Typical construction timeline for a 1,500 sq ft residential house in Pakistan: "
            "Design & approvals: 2–3 months. "
            "Foundation work (excavation, layout, footing): 3–4 weeks. "
            "Ground floor structure (columns, beams, slab): 6–8 weeks. "
            "Brickwork, plumbing conduits, electrical conduits: 4–6 weeks. "
            "First floor structure (if applicable): 6–8 weeks. "
            "Roof slab + waterproofing: 4–5 weeks. "
            "Plaster, flooring, tiling: 6–8 weeks. "
            "Painting, doors, windows: 3–4 weeks. "
            "Fixtures, fittings, external works: 2–3 weeks. "
            "Total: approximately 10–14 months for a standard two-story house. "
            "Note: monsoon season (July–September) can delay concrete work by 3–4 weeks."
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # ARCHITECTURAL STYLES & DESIGN TRENDS
    # ─────────────────────────────────────────────────────────────
    {
        "id": "style_001",
        "category": "design_style",
        "tags": ["modern", "contemporary", "minimalist", "design", "style", "trend"],
        "content": (
            "Modern/Contemporary architecture characteristics: "
            "Clean lines with minimal or no ornamentation. Large windows and glass facades for connection with outside. "
            "Flat or low-pitched roofs with parapets. Open-plan living spaces that flow into each other. "
            "Use of exposed materials: concrete, steel, glass. Monochromatic or neutral color palettes. "
            "Biophilic elements: indoor plants, green walls, natural wood accents. "
            "In Pakistan, contemporary design adapts by adding deep verandas and chajjas for sun shading while maintaining modern aesthetics. "
            "Mixed materials: smooth plaster with brick-cladding or stone accents are popular in Lahore and Islamabad."
        ),
    },
    {
        "id": "style_002",
        "category": "design_style",
        "tags": ["traditional", "Mughal", "Islamic", "heritage", "classical", "haveli"],
        "content": (
            "Traditional Pakistani/Islamic architecture elements: "
            "Courtyard (sehan) design: central open courtyard surrounded by rooms — provides natural cooling and privacy. "
            "Jaali screens: perforated stone or brick screens that allow breeze while maintaining privacy — a signature element of Pakistani architecture. "
            "Arches: pointed (ogival) and horseshoe arches from Mughal tradition. "
            "Chatri (kiosk): small elevated dome pavilions at building corners — decorative and functional as a ventilation tower. "
            "Muqarnas: stalactite-like decorative vaulting in niches and semi-domes. "
            "Materials: Taxila stone, red Jodhpuri sandstone, white Makrana marble, hand-carved woodwork. "
            "Contemporary architects are reviving these elements in modern interpretations — known as 'neo-vernacular' design."
        ),
    },
    {
        "id": "style_003",
        "category": "design_style",
        "tags": ["interior design", "interior", "colors", "furniture", "space"],
        "content": (
            "Interior design principles for Pakistani homes: "
            "Space planning: ensure 30–36 inches of circulation space around furniture. "
            "Color psychology: cool colors (blues, greens, whites) reduce perceived heat in hot rooms; warm tones (terracotta, amber) add coziness to north-facing rooms. "
            "Lighting layers: ambient (overall), task (work areas), accent (display/art). Add dimmers for flexibility. "
            "Furniture scale: oversized furniture in small rooms makes space feel cramped; choose pieces proportional to room size. "
            "Vertical space: use tall shelving and high curtains (floor-to-ceiling) to make rooms feel taller. "
            "Pakistani design trends 2024: Japandi (Japanese + Scandinavian minimalism), earthy terracotta + beige palettes, fluted wood panels, arched doorways."
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # SITE & URBAN PLANNING
    # ─────────────────────────────────────────────────────────────
    {
        "id": "site_001",
        "category": "site_planning",
        "tags": ["site analysis", "site planning", "survey", "topography", "land"],
        "content": (
            "Site analysis checklist before designing: "
            "1. Topography: slope direction, high and low points (affects drainage design). "
            "2. Solar path: track sunrise/sunset direction to optimize building orientation. "
            "3. Prevailing wind: use wind roses for the city to optimize cross-ventilation. "
            "4. Existing trees: preserve mature trees with dripline protection during construction. "
            "5. Underground utilities: locate water, sewer, gas, electrical lines before excavation. "
            "6. Soil investigation: bore holes to determine bearing capacity and water table level. "
            "7. Neighboring buildings: analyze views, overshadowing, and privacy implications. "
            "8. Access: evaluate vehicular entry, pedestrian routes, service access."
        ),
    },
    {
        "id": "site_002",
        "category": "site_planning",
        "tags": ["drainage", "storm water", "grading", "site drainage", "slope"],
        "content": (
            "Site drainage design principles: "
            "Grade all landscaped areas away from buildings at minimum 2% slope (1 inch drop per 4 feet). "
            "Storm water runoff: use paved area × rainfall intensity × runoff coefficient to size drains. "
            "French drain (perforated pipe in gravel trench) effective for areas with high water table. "
            "In urban Pakistan, connect to municipal storm drain only — never to sewage line. "
            "Permeable paving (gravel, permeable pavers) in driveways and parking lots reduces runoff and recharges groundwater. "
            "Roof drainage: minimum one 100 mm downpipe per 40 sq m of roof area. "
            "Retention pond or infiltration basin for large sites (commercial/institutional)."
        ),
    },

    # ─────────────────────────────────────────────────────────────
    # COMMON QUESTIONS & ADVICE
    # ─────────────────────────────────────────────────────────────
    {
        "id": "qa_001",
        "category": "general_advice",
        "tags": ["architect", "engineer", "hire", "professional", "consultant"],
        "content": (
            "When to hire which professional: "
            "Architect: for design of spatial layout, aesthetics, approvals, coordination. Required by law for buildings over 300 sq m in most Pakistani cities. "
            "Structural Engineer: for design of foundation, columns, beams, slabs — always required. PEC registered. "
            "Civil Engineer: for site supervision, quality control, execution management. "
            "MEP Engineer: for large projects — designs HVAC, plumbing, electrical systems. "
            "Interior Designer: for finishes, furniture, lighting — optional but adds significant value. "
            "Quantity Surveyor: for bill of quantities, cost control, tender evaluation. "
            "Landscape Architect: for external areas, planting, hardscaping. "
            "Ensure all professionals are registered with PEC (Pakistan Engineering Council) or PCATP (Pakistan Council of Architects and Town Planners)."
        ),
    },
    {
        "id": "qa_002",
        "category": "general_advice",
        "tags": ["contractor", "construction company", "tender", "contract"],
        "content": (
            "Selecting a contractor in Pakistan: "
            "Obtain at least 3 competitive tenders from registered contractors. "
            "Check PEC contractor registration category (C6 = largest capacity). "
            "Review portfolio of similar completed projects and visit sites. "
            "Check financial stability — ask for bank guarantee or performance bond for projects over PKR 50 lac. "
            "Contract types: lump-sum (fixed price, low risk for client), unit rate (risk shared), cost-plus (flexible but cost uncertain). "
            "Include escalation clauses for steel and cement price changes in contracts. "
            "Milestone-based payment schedule: never pay more than 10% mobilization advance. "
            "Retain 5–10% as defect liability retention for 12 months after completion."
        ),
    },
    {
        "id": "qa_003",
        "category": "general_advice",
        "tags": ["design process", "architecture process", "steps", "how to design"],
        "content": (
            "Architectural design process: "
            "1. Brief/Programming: define space requirements, budget, style preferences, timeline. "
            "2. Concept design (Schematic): explore 2–3 layout options; select preferred direction. "
            "3. Design development: refine selected concept, define materials, resolve technical issues. "
            "4. Construction documents: detailed working drawings for contractor and authority approval. "
            "5. Bidding: tender to contractors, evaluate, select. "
            "6. Construction administration: site visits, RFIs, shop drawing review, quality oversight. "
            "7. Completion: punch list, as-built drawings, occupancy certificate, handover. "
            "Skipping any phase creates problems later — design is an investment, not a cost."
        ),
    },
    {
        "id": "qa_004",
        "category": "general_advice",
        "tags": ["tips", "common mistakes", "avoid", "problems", "construction"],
        "content": (
            "Common construction mistakes to avoid in Pakistan: "
            "1. Skipping soil investigation — leads to foundation failures and settlement. "
            "2. Using substandard cement or steel to save money — compromises structural safety. "
            "3. No proper waterproofing — the single most common cause of building deterioration. "
            "4. Changing design during construction — extremely costly and causes structural compromises. "
            "5. Not getting structural drawings approved — illegal and dangerous. "
            "6. Relying on contractors to design — contractors build, they don't design. "
            "7. Under-budgeting — always add 15–20% contingency to initial estimates. "
            "8. Starting construction without complete drawings — leads to errors and costly rework."
        ),
    },
    {
        "id": "qa_005",
        "category": "general_advice",
        "tags": ["plot", "house", "5 marla", "10 marla", "1 kanal", "dimensions"],
        "content": (
            "Common Pakistani plot sizes and design guidance: "
            "5 Marla = 125 sq yd = 1,125 sq ft. Typical design: G+1, 3 beds, 2 baths. Covered area: 900 sq ft per floor. "
            "10 Marla = 250 sq yd = 2,250 sq ft. Design: G+1 or G+2, 4 beds, 3 baths, drawing room. Covered area: 1,400 sq ft per floor. "
            "1 Kanal = 500 sq yd = 4,500 sq ft. Design: G+1 or G+2, 5–6 beds, 4 baths, servant quarters, double garage. "
            "2 Kanal = 1,000 sq yd = 9,000 sq ft. True luxury — cinema, gym, pool possible. "
            "In DHA Lahore/Karachi/Islamabad: plot size determines maximum covered area and height per specific DHA bylaws."
        ),
    },
]
