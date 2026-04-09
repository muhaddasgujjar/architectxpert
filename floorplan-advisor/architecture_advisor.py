"""
ArchitectXpert — Architecture Advisor Engine (Python)
======================================================
Generates comprehensive architectural recommendations based on
project parameters using rule-based expert system with Pakistani
construction standards, local materials, and PKR pricing.

Usage:  python architecture_advisor.py '<JSON input>'
Output: JSON to stdout
"""

import sys
import json
import math

# ═══════════════════════════════════════════════════════════════════════════════
#  KNOWLEDGE BASE: Pakistani construction data
# ═══════════════════════════════════════════════════════════════════════════════

LOCATION_DATA = {
    "lahore":     {"zone": "hot_humid", "seismic": 2, "label": "Lahore, Punjab"},
    "karachi":    {"zone": "hot_arid_coastal", "seismic": 2, "label": "Karachi, Sindh"},
    "islamabad":  {"zone": "moderate", "seismic": 3, "label": "Islamabad"},
    "rawalpindi": {"zone": "moderate", "seismic": 3, "label": "Rawalpindi"},
    "peshawar":   {"zone": "hot_arid", "seismic": 4, "label": "Peshawar, KPK"},
    "quetta":     {"zone": "extreme_arid", "seismic": 4, "label": "Quetta, Balochistan"},
    "multan":     {"zone": "hot_arid", "seismic": 2, "label": "Multan, Punjab"},
    "faisalabad": {"zone": "hot_humid", "seismic": 2, "label": "Faisalabad, Punjab"},
}

COST_PER_SQFT = {
    "Residential Home":      {"standard": 2800, "premium": 4500, "luxury": 7000},
    "Apartment Complex":     {"standard": 3200, "premium": 5000, "luxury": 7500},
    "Commercial Office":     {"standard": 3500, "premium": 5500, "luxury": 8000},
    "Retail Store":          {"standard": 3000, "premium": 4800, "luxury": 7200},
    "Restaurant":            {"standard": 4000, "premium": 6000, "luxury": 9000},
    "Warehouse":             {"standard": 1800, "premium": 2800, "luxury": 4000},
    "Hospital / Clinic":     {"standard": 5000, "premium": 7500, "luxury": 12000},
    "School / University":   {"standard": 2500, "premium": 4000, "luxury": 6000},
    "Hotel":                 {"standard": 4500, "premium": 7000, "luxury": 11000},
    "Mixed-Use Development": {"standard": 3800, "premium": 5800, "luxury": 8500},
    "Religious Building":    {"standard": 2200, "premium": 3800, "luxury": 6500},
    "Sports Facility":       {"standard": 3000, "premium": 5000, "luxury": 8000},
}

MATERIALS_DB = {
    "Residential Home": [
        {"name": "AAC Blocks (Autoclaved Aerated Concrete)", "use": "Walls & Partitions", "benefit": "30% lighter than clay bricks, excellent thermal insulation (R-value 1.25/inch), reduces AC costs by 15-20% in Pakistani summers. Available from Master, Lucky, and local AAC plants."},
        {"name": "Grade 60 Steel Reinforcement (ASTM A615)", "use": "RCC Framework", "benefit": "Higher yield strength (60,000 psi) means 15% less steel quantity vs Grade 40. Approved by PEC for seismic zone 2-4 construction. Available from Amreli, Mughal, and ISL Steel."},
        {"name": "Thermopane Double-Glazed Windows", "use": "Fenestration", "benefit": "Reduces heat gain by 40% compared to single glazing. Essential for Lahore/Multan's extreme summers. Brands: Weatherseal, Diamond, Euro."},
        {"name": "Grohe/Porta Sanitary Fittings", "use": "Bathrooms & Kitchen", "benefit": "Premium quality with 10-year warranty. Porta offers excellent value at PKR 35,000-80,000 per bathroom set. Grohe for luxury at PKR 150,000+."},
        {"name": "Dr. Fixit Waterproofing System", "use": "Foundation & Roof", "benefit": "Integral waterproofing for foundations + membrane system for roofs. Prevents 90% of seepage issues in Punjab's monsoon season. PKR 35-50/sqft applied cost."},
    ],
    "Commercial Office": [
        {"name": "Structural Steel (ASTM A992)", "use": "Structural Frame", "benefit": "Faster erection than RCC (40% time savings), enables large column-free spans of 40+ feet ideal for open-plan offices. Available from Amreli and International Steels."},
        {"name": "Raised Access Flooring", "use": "Office Floors", "benefit": "Enables flexible under-floor cable management, HVAC distribution, and future reconfiguration without demolition. PKR 800-1500/sqft installed."},
        {"name": "Gypsum Board Partitions (Knauf/Gyproc)", "use": "Interior Walls", "benefit": "Non-load-bearing partitions that are 60% faster to install than masonry, easily relocatable, and provide STC 45+ sound rating for privacy."},
        {"name": "VRF HVAC System (Daikin/Mitsubishi)", "use": "Climate Control", "benefit": "Variable Refrigerant Flow system offers 30% energy savings over conventional split ACs, individual zone control, and quiet operation (28 dB)."},
        {"name": "Fire-Rated Doors (UL Listed)", "use": "Safety & Compliance", "benefit": "2-hour fire-rated doors meeting SBCA requirements. Essential for commercial occupancy permits. PKR 45,000-120,000 per door."},
    ],
    "Apartment Complex": [
        {"name": "RCC Shear Wall System", "use": "Structural Core", "benefit": "Provides lateral stability for multi-story buildings (4+ floors). Reduces column sizes by 20% and improves seismic resistance per PEC guidelines."},
        {"name": "Precast Concrete Slabs", "use": "Floor System", "benefit": "50% faster floor construction vs cast-in-situ, excellent dimensional accuracy, reduces formwork costs by 40%. Available from Attock Cement precast division."},
        {"name": "CPVC Piping (Astral/Wavin)", "use": "Plumbing", "benefit": "Chlorinated PVC resists hot water scaling, no corrosion, 50-year lifespan. Reduces plumbing maintenance by 70% vs GI pipes. PKR 80-120/ft installed."},
        {"name": "Elevator System (Sigma/Fuji)", "use": "Vertical Transport", "benefit": "Machine-room-less (MRL) elevators save 10% shaft space. Fuji offers excellent after-sales in Pakistan with PKR 35-55 lac per unit installed."},
        {"name": "External Thermal Insulation (EIFS)", "use": "Building Envelope", "benefit": "Reduces heating/cooling loads by 35%, eliminates thermal bridging, and provides aesthetic flexibility. PKR 250-450/sqft applied."},
    ],
}

# Default materials for types not explicitly listed
DEFAULT_MATERIALS = [
    {"name": "Portland Cement (Type-I, OPC)", "use": "Foundation & Structure", "benefit": "Widely available from Lucky, DG Khan, Bestway, and Maple Leaf. OPC Type-I suitable for most construction. PKR 1,100-1,350 per 50kg bag."},
    {"name": "Crush Aggregate (Margalla Grade)", "use": "Concrete Mix", "benefit": "Margalla Hills aggregate provides excellent compressive strength (4000+ psi). Available at PKR 60-85 per cubic foot in Punjab region."},
    {"name": "Ravi Sand (Fine Aggregate)", "use": "Masonry & Plaster", "benefit": "River sand from Ravi/Chenab provides ideal gradation for 1:4 mortar mix. PKR 50-70/cft. Alternative: manufactured sand (M-sand) at PKR 40-55/cft."},
    {"name": "Clay Bricks (First Class)", "use": "Masonry Walls", "benefit": "Standard 9x4.5x3 inch size, compressive strength 3500+ psi. PKR 12,000-16,000 per 1000 bricks. Ensure kiln-burnt quality from registered bhatta."},
    {"name": "PPC Waterproof Cement", "use": "Wet Areas & Foundation", "benefit": "Portland Pozzolana Cement with integral waterproofing for foundations, basements, and wet areas. PKR 1,200-1,500 per bag."},
]


def detect_location(loc_str: str) -> dict:
    if not loc_str:
        return {"zone": "hot_humid", "seismic": 2, "label": "Pakistan (General)"}
    loc_lower = loc_str.lower()
    for key, data in LOCATION_DATA.items():
        if key in loc_lower:
            return data
    return {"zone": "hot_humid", "seismic": 2, "label": loc_str}


def detect_budget_tier(budget_str: str) -> str:
    if not budget_str:
        return "standard"
    b = budget_str.lower()
    if "50 cr" in b or "10" in b:
        return "luxury"
    if "3" in b and "cr" in b:
        return "premium"
    if "1" in b and "cr" in b:
        return "premium"
    if "50 lac" in b:
        return "standard"
    return "standard"


def analyze(params: dict) -> dict:
    project_type = params.get("projectType", "Residential Home")
    area = int(params.get("area", 1200))
    floors = int(params.get("floors", 1) or 1)
    location_str = params.get("location", "")
    budget_str = params.get("budget", "")
    style = params.get("style", "Modern / Contemporary")
    priorities = params.get("priorities", "")
    description = params.get("description", "")

    loc = detect_location(location_str)
    tier = detect_budget_tier(budget_str)

    costs = COST_PER_SQFT.get(project_type, COST_PER_SQFT["Residential Home"])
    cost_sqft = costs.get(tier, costs["standard"])
    total_cost = area * floors * cost_sqft
    total_area_all_floors = area * floors

    # ── Project Overview ──────────────────────────────────────────────────
    overview = (
        f"This {project_type.lower()} project encompasses {total_area_all_floors:,} sq ft "
        f"across {floors} floor{'s' if floors > 1 else ''} in {loc['label']}. "
        f"Based on the {tier} construction tier at PKR {cost_sqft:,}/sqft, the estimated "
        f"construction cost is PKR {total_cost:,.0f} "
        f"({'PKR ' + f'{total_cost/10000000:.2f}' + ' Crore' if total_cost >= 10000000 else 'PKR ' + f'{total_cost/100000:.2f}' + ' Lac'}). "
        f"The {loc['zone'].replace('_', ' ')} climate zone requires careful attention to "
        f"thermal insulation, waterproofing, and ventilation. "
        f"{'The preferred ' + style.lower() + ' aesthetic will be integrated throughout the design. ' if style else ''}"
        f"Seismic Zone {loc['seismic']} {'requires enhanced structural detailing per PEC Building Code 2021' if loc['seismic'] >= 3 else 'follows standard structural provisions'}. "
        f"{'Priority areas include ' + priorities + '.' if priorities else ''}"
    )

    # ── Design Recommendations ────────────────────────────────────────────
    recs = []
    if "Residential" in project_type or "Apartment" in project_type:
        recs.extend([
            f"Orient the main living areas towards the south-southeast for optimal winter sun exposure in {loc['label']}. North-facing bedrooms stay cooler in summer.",
            "Implement a 3-foot deep chajja (overhang) on south and west facades to reduce direct solar heat gain by 40-60% during peak summer months.",
            f"Design the master bedroom at minimum {max(180, area // 8)} sqft with an attached bathroom. PBC 2021 recommends minimum 120 sqft for habitable rooms.",
            "Include a dedicated servant quarter with separate entrance — standard requirement for premium Pakistani residential projects.",
            "Position the kitchen adjacent to the dining area with a service corridor to the main entrance for grocery delivery access.",
        ])
    elif "Commercial" in project_type or "Office" in project_type:
        recs.extend([
            "Design open-plan workspaces with 80-100 sqft per workstation, following international density standards for modern offices.",
            "Include a dedicated server room (minimum 120 sqft) with independent cooling and UPS power backup — essential for Pakistani load-shedding conditions.",
            f"Plan for at least {max(2, area // 2000)} conference rooms of varying sizes to support collaborative work culture.",
            "Install raised access flooring throughout office areas to enable flexible cable management and future reconfiguration.",
            "Provide dedicated prayer room (minimum 200 sqft) with ablution area — mandatory for commercial buildings in Pakistan.",
        ])
    else:
        recs.extend([
            f"Optimize the floor layout to achieve minimum 70% space utilization efficiency for {project_type.lower()} typology.",
            "Ensure all corridors meet minimum 5-foot width requirement per Pakistan Building Code for public/commercial occupancy.",
            "Install emergency lighting and exit signage per SBCA requirements for buildings over 2,500 sqft.",
            "Design the facade to reflect the local architectural vernacular while meeting energy efficiency targets.",
            "Plan for adequate parking at 1 space per 500 sqft of built area per local authority requirements.",
        ])

    # Climate-specific recommendations
    if "hot" in loc["zone"]:
        recs.append("Install solar reflective roof coating (SRI > 78) to reduce rooftop temperatures by 15-20°C during summers exceeding 45°C.")
    if "humid" in loc["zone"]:
        recs.append("Use cross-ventilation design with windcatchers to reduce humidity-related discomfort. Minimum 8% window-to-floor area ratio on windward side.")
    if loc["seismic"] >= 3:
        recs.append(f"Seismic Zone {loc['seismic']}: Use moment-resisting RCC frames with detailing per PEC Chapter 21. Minimum Grade 60 steel reinforcement with 135° hooks.")

    if style:
        style_recs = {
            "Modern / Contemporary": "Emphasize clean lines, flat roofs with parapet walls, and large glazing panels. Use exposed concrete or plaster finishes.",
            "Minimalist": "Focus on essential spatial elements. Use neutral color palette (whites, greys, warm wood tones) with concealed storage solutions.",
            "Industrial": "Expose structural elements (steel beams, concrete columns). Use polished concrete floors and metal-framed windows for authentic industrial aesthetic.",
            "Traditional / Classical": "Incorporate Mughal-inspired arches, jaali screens, and courtyard (haveli) layout. Use local Taxila stone and hand-carved woodwork.",
            "Mediterranean": "Use terracotta roof tiles, stucco walls, and arched openings. Courtyard-centered layout with water features for evaporative cooling.",
            "Sustainable / Biophilic": "Integrate green walls, rooftop gardens, and natural materials. Target LEED Gold certification with rainwater harvesting and solar panels.",
        }
        if style in style_recs:
            recs.append(style_recs[style])

    # ── Materials ─────────────────────────────────────────────────────────
    materials = MATERIALS_DB.get(project_type, DEFAULT_MATERIALS)[:5]

    # ── Sustainability ────────────────────────────────────────────────────
    sustainability = [
        f"Install a {max(3, area // 400)} kW solar panel system on the rooftop — generates approximately {max(3, area // 400) * 4} kWh/day, offsetting 40-60% of electricity costs at current WAPDA tariffs.",
        "Implement rainwater harvesting with underground storage tank — Punjab receives 500-750mm annual rainfall which can supply 30% of non-potable water needs.",
        "Use LED lighting throughout (minimum 100 lm/W efficacy) with occupancy sensors in corridors and bathrooms. Reduces lighting energy by 60% vs CFL.",
        "Install grey water recycling system for landscape irrigation and toilet flushing — reduces municipal water consumption by 35%.",
        f"Plant native trees (Neem, Peepal, Amaltas) on {'south and west' if 'hot' in loc['zone'] else 'all'} boundaries for natural shading and improved air quality.",
        "Use low-VOC paints and adhesives throughout to maintain indoor air quality standards (ASHRAE 62.1) and reduce occupant health risks.",
    ]

    # ── Building Codes ────────────────────────────────────────────────────
    codes = [
        f"Pakistan Building Code (PBC) 2021: Minimum plot coverage {'60%' if 'Residential' in project_type else '75%'} for {loc['label']} zone. Maximum FAR (Floor Area Ratio): {1.5 if floors <= 2 else min(3.5, floors * 0.8):.1f}.",
        f"Seismic Design: Zone {loc['seismic']} — {'enhanced ductile detailing and shear wall system required' if loc['seismic'] >= 3 else 'standard seismic provisions apply'}. Response modification factor R = {5 if loc['seismic'] >= 3 else 3}.",
        f"Fire Safety (SBCA): {'Sprinkler system mandatory for buildings > 3 floors' if floors > 3 else 'Minimum 2 fire extinguishers per floor'}. {'Fire escape stairway required every 30m travel distance.' if floors > 2 else ''}",
        f"Minimum setbacks: Front {'15 ft' if area > 2000 else '10 ft'}, Sides {'5 ft' if area > 1500 else '3 ft'}, Back {'8 ft' if area > 2000 else '5 ft'} per local authority bylaws.",
        f"Structural design load: Live load = {'40 psf (residential)' if 'Residential' in project_type else '60 psf (commercial/public)'}, Dead load per structural engineer calculation. Wind load per ASCE 7 adapted for local conditions.",
        "Electrical wiring: Minimum 3-phase connection for buildings > 1,500 sqft. Main DB with MCBs/RCDs per WAPDA standards. Earthing as per PEC guidelines.",
    ]

    # ── Cost Breakdown ────────────────────────────────────────────────────
    if "Residential" in project_type:
        cost_breakdown = {"structure": 35, "interior": 25, "mechanical": 20, "exterior": 12, "permits_fees": 8}
    elif "Commercial" in project_type or "Office" in project_type:
        cost_breakdown = {"structure": 30, "interior": 20, "mechanical": 28, "exterior": 14, "permits_fees": 8}
    elif "Hospital" in project_type:
        cost_breakdown = {"structure": 25, "interior": 18, "mechanical": 35, "exterior": 12, "permits_fees": 10}
    else:
        cost_breakdown = {"structure": 32, "interior": 22, "mechanical": 24, "exterior": 13, "permits_fees": 9}

    # ── Timeline ──────────────────────────────────────────────────────────
    months_base = max(6, math.ceil(total_area_all_floors / 800))
    if tier == "luxury":
        months_base = int(months_base * 1.4)
    elif tier == "premium":
        months_base = int(months_base * 1.2)

    timeline = (
        f"Estimated total duration: {months_base} months. "
        f"Phase 1 — Design & Approvals: {max(2, months_base // 5)} months (architectural drawings, structural design, authority approvals from {'LDA' if 'lahore' in location_str.lower() else 'SBCA' if 'karachi' in location_str.lower() else 'CDA' if 'islamabad' in location_str.lower() else 'local development authority'}). "
        f"Phase 2 — Foundation & Structure: {max(3, months_base // 3)} months (excavation, foundation, columns, beams, slabs). "
        f"Phase 3 — Brick Work & Plumbing: {max(2, months_base // 4)} months (walls, rough plumbing, electrical conduits). "
        f"Phase 4 — Finishing: {max(3, months_base // 3)} months (plastering, flooring, painting, fixtures, kitchen, bathroom fittings). "
        f"Phase 5 — External Works: {max(1, months_base // 6)} months (driveway, boundary wall, landscaping, final inspection). "
        f"Note: Monsoon season (July-September) may add 4-6 weeks delay to concrete and masonry work."
    )

    # ── Risk Factors ──────────────────────────────────────────────────────
    risks = [
        f"Material price volatility: Steel and cement prices in Pakistan fluctuate 10-25% annually. Current steel rate: PKR 260,000-280,000/ton. Budget a 15% contingency for material escalation.",
        f"{'Seismic risk: Located in Zone ' + str(loc['seismic']) + ' — ensure structural design accounts for peak ground acceleration of ' + ('0.20g' if loc['seismic'] >= 3 else '0.10g') + ' per PEC seismic code.' if loc['seismic'] >= 2 else 'Low seismic risk in this region.'}",
        f"Load-shedding: {'8-12 hours daily' if tier == 'standard' else '4-6 hours daily with prepaid meter'} power outages typical in {loc['label']}. Budget for {'5' if area < 2000 else '15'} kVA generator (PKR {500000 if area < 2000 else 1500000:,}) and UPS system.",
        "Contractor reliability: Verify contractor registration with PEC (Pakistan Engineering Council). Obtain performance bonds for projects exceeding PKR 50 lac.",
        f"Regulatory delays: {'LDA/TMA approval process typically takes 2-4 months' if 'lahore' in location_str.lower() else 'Authority approvals may take 2-6 months'}. Factor this into project timeline.",
        f"Monsoon flooding risk: {'High — ensure plinth level minimum 2 feet above road level and install sump pump in basement' if 'humid' in loc['zone'] else 'Moderate — standard drainage provisions adequate'}.",
    ]

    # ── Space Optimization ────────────────────────────────────────────────
    if "Residential" in project_type:
        space = (
            f"For a {area:,} sqft residence, optimize layout by positioning wet areas (kitchen, bathrooms) along one wall to minimize plumbing runs. "
            f"Use a service core approach — stack all vertical services (water, drainage, electrical) in a single shaft for each floor. "
            f"Allocate {'25-30%' if area > 2000 else '30-35%'} of total area to living/dining (social zone), {'40-45%' if area > 2000 else '35-40%'} to bedrooms (private zone), "
            f"and remaining {'25-30%' if area > 2000 else '25-30%'} to services (kitchen, bathrooms, stores, circulation). "
            f"{'Include a double-height entrance foyer for visual grandeur. ' if area > 3000 else ''}"
            f"Dead corners can be converted to built-in wardrobes, reading nooks, or utility storage. "
            f"Consider an open-plan living-dining layout to maximize perceived space and natural light penetration."
        )
    else:
        space = (
            f"For this {total_area_all_floors:,} sqft {project_type.lower()}, aim for {'70-75%' if 'Office' in project_type else '75-80%'} net-to-gross efficiency ratio. "
            f"Minimize corridor area to under 15% of total floor plate through efficient core placement. "
            f"Use modular grid planning ({'8m x 8m' if 'Office' in project_type else '6m x 6m'} column grid) for maximum layout flexibility. "
            f"{'Position elevator and stair core centrally to minimize walking distances.' if floors > 1 else ''} "
            f"Reserve 3-5% floor area for mechanical rooms, electrical panels, and service access."
        )

    return {
        "project_overview": overview,
        "design_recommendations": recs[:8],
        "material_suggestions": materials,
        "sustainability_tips": sustainability[:5],
        "building_codes": codes[:5],
        "cost_breakdown": cost_breakdown,
        "estimated_timeline": timeline,
        "risk_factors": risks[:5],
        "space_optimization": space,
    }


# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input JSON provided"}))
        sys.exit(1)

    try:
        params = json.loads(sys.argv[1])
        result = analyze(params)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
