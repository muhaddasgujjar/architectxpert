import os
os.chdir(r'C:\Users\Dell\Downloads\ArtitectXpert\cost-analyzer')
from market_model import predict_market_value

tests = [
    ("5 marla Bahria Town Lahore",  {"area_sqft":1089,"bedrooms":3,"bathrooms":2,"floors":1,"city":"lahore","location":"bahria town","property_type":"house","purpose":"for sale","house_age":3}),
    ("10 marla DHA Lahore",         {"area_sqft":2722,"bedrooms":4,"bathrooms":4,"floors":2,"city":"lahore","location":"dha defence","property_type":"house","purpose":"for sale","house_age":5}),
    ("2 bed flat Islamabad E-11",   {"area_sqft":1089,"bedrooms":2,"bathrooms":2,"floors":1,"city":"islamabad","location":"e-11","property_type":"flat","purpose":"for sale","house_age":2}),
    ("1 kanal Gulberg Lahore",      {"area_sqft":4500,"bedrooms":5,"bathrooms":5,"floors":2,"city":"lahore","location":"gulberg","property_type":"house","purpose":"for sale","house_age":0}),
]

for label, inp in tests:
    r = predict_market_value(inp)
    pkr = r["predictedMarketValue"]
    crore = pkr / 10_000_000
    print(f"{label}: PKR {pkr:>14,.0f}  ({crore:.2f} Cr)")
