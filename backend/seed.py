import json
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models import models

def seed_db():
    db = SessionLocal()
    
    # 1. Clear existing data
    print("Clearing database...")
    db.query(models.Destination).delete()
    db.query(models.Alert).delete()
    db.query(models.EmergencyContact).delete()
    db.query(models.SafeCheckIn).delete()
    db.query(models.RiskReport).delete()
    db.commit()
    
    # 2. Seed Destinations
    print("Seeding destinations...")
    destinations = [
        models.Destination(
            name="Tokyo",
            country="Japan",
            latitude=35.6762,
            longitude=139.6503,
            base_safety_score=94,
            emergency_contacts_json=json.dumps({
                "police": "110",
                "fire": "119",
                "medical": "119",
                "embassy": "+81-3-3224-5000 (US Embassy Tokyo)"
            }),
            cultural_tips_json=json.dumps([
                "Bow slightly when greeting someone as a sign of respect.",
                "Tipping is not customary and can be seen as impolite.",
                "Keep your voice low on public transit; talking on mobile phones is discouraged.",
                "Always stand on the left side of escalators in Tokyo (right in Osaka) to let others pass."
            ]),
            local_laws_json=json.dumps([
                "Carry your passport with you at all times; police can ask to inspect it.",
                "Smoking is banned outdoors on public streets except in designated smoking areas.",
                "Very strict laws regarding import of certain over-the-counter medications (e.g., inhalers, ADHD meds)."
            ])
        ),
        models.Destination(
            name="Rio de Janeiro",
            country="Brazil",
            latitude=-22.9068,
            longitude=-43.1729,
            base_safety_score=52,
            emergency_contacts_json=json.dumps({
                "police": "190",
                "fire": "193",
                "medical": "192",
                "embassy": "+55-21-3823-2000 (US Consulate Rio)"
            }),
            cultural_tips_json=json.dumps([
                "Casual attire is common; dress down to blend in and avoid showing wealth.",
                "Locals (Cariocas) are warm and expressive; physical contact during conversation is normal.",
                "Say 'Obrigado' (male) or 'Obrigada' (female) for thank you."
            ]),
            local_laws_json=json.dumps([
                "Jaywalking is rarely prosecuted, but traffic is unpredictable. Exercise caution.",
                "Possession of illegal drugs carries severe penal consequences.",
                "You are legally required to carry a photo ID at all times."
            ])
        ),
        models.Destination(
            name="Paris",
            country="France",
            latitude=48.8566,
            longitude=2.3522,
            base_safety_score=78,
            emergency_contacts_json=json.dumps({
                "police": "17",
                "fire": "18",
                "medical": "15",
                "embassy": "+33-1-43-12-22-22 (US Embassy Paris)"
            }),
            cultural_tips_json=json.dumps([
                "Always start any interaction with 'Bonjour' (day) or 'Bonsoir' (evening). It is considered rude not to.",
                "Keep voices down in restaurants and public spaces.",
                "Service charge (service compris) is included in restaurant bills, but leaving a small extra tip for good service is appreciated."
            ]),
            local_laws_json=json.dumps([
                "Concealing one's face in public spaces is illegal.",
                "It is illegal to ignore a person in distress if you are able to assist them without danger to yourself.",
                "Strict regulations exist regarding flying recreational drones in urban areas."
            ])
        ),
        models.Destination(
            name="Cairo",
            country="Egypt",
            latitude=30.0444,
            longitude=31.2357,
            base_safety_score=68,
            emergency_contacts_json=json.dumps({
                "police": "122",
                "fire": "180",
                "medical": "123",
                "embassy": "+20-2-2797-3300 (US Embassy Cairo)"
            }),
            cultural_tips_json=json.dumps([
                "Dress conservatively, covering shoulders and knees, especially when visiting mosques.",
                "Use your right hand for eating, greeting, and passing items.",
                "Tipping (Baksheesh) is deeply ingrained in daily life for almost all services."
            ]),
            local_laws_json=json.dumps([
                "Taking photos of or near military, police installations, or public infrastructure is strictly illegal.",
                "Public displays of affection are highly discouraged and can lead to police intervention.",
                "Severe penalties for drug offences, which can include capital punishment."
            ])
        ),
        models.Destination(
            name="New York City",
            country="United States",
            latitude=40.7128,
            longitude=-74.0060,
            base_safety_score=83,
            emergency_contacts_json=json.dumps({
                "police": "911",
                "fire": "911",
                "medical": "911",
                "embassy": "Local US Emergency Services"
            }),
            cultural_tips_json=json.dumps([
                "Tipping 18-20% is standard in restaurants and bars.",
                "Walk briskly on sidewalks, and step to the side if you need to look at a map or phone.",
                "The city is highly diverse and fast-paced; expect direct communication."
            ]),
            local_laws_json=json.dumps([
                "Open containers of alcohol in public streets are illegal.",
                "Smoking/vaping is prohibited in public parks, beaches, and indoor workplaces.",
                "Right turn on red lights is illegal inside NYC limits unless a sign permits it."
            ])
        )
    ]
    
    for d in destinations:
        db.add(d)
    
    # 3. Seed Alerts
    print("Seeding alerts...")
    alerts = [
        models.Alert(
            title="Public Transit Protest/Demonstration",
            description="Active demonstration scheduled around Place de la République. Heavy police presence. Subway lines 3, 5, 8, 9 experiencing temporary station bypasses and delays. Avoid the immediate area to prevent getting caught in crowd dispersals.",
            category="unrest",
            severity="danger",
            latitude=48.8675,
            longitude=2.3638,
            radius_km=2.0
        ),
        models.Alert(
            title="Pickpocket Syndicate Alert: Louvre/Eiffel Area",
            description="Increased reports of coordinated pickpocket groups targeting tourists near major landmarks. Operators utilize distraction techniques (fake surveys, clipboard signups). Secure all valuables in internal zipped pockets.",
            category="crime",
            severity="warning",
            latitude=48.8606,
            longitude=2.3376,
            radius_km=3.0
        ),
        models.Alert(
            title="Severe Typhoon Shanshan Tracking",
            description="Typhoon Shanshan is approaching eastern Honshu. Winds up to 140km/h expected with heavy torrential rainfall. High risk of train cancellations (Shinkansen) and domestic flight disruptions starting tonight. Residents and travelers are advised to stock up on emergency supplies.",
            category="weather",
            severity="critical",
            latitude=35.6,
            longitude=140.0,
            radius_km=150.0
        ),
        models.Alert(
            title="Extreme Heat Dome Advisory",
            description="Daytime temperatures rising to 43°C (109°F). High UV index. Minimize direct sunlight exposure between 11 AM and 4 PM. Drink bottled water with electrolyte supplements. Public water stations have been activated across central tourist spots.",
            category="weather",
            severity="warning",
            latitude=30.04,
            longitude=31.23,
            radius_km=30.0
        ),
        models.Alert(
            title="Active Riptide & Beach Wave Warning",
            description="Red flags raised on Copacabana and Ipanema beaches. Extremely high undertow and hazardous rip currents reported due to offshore low pressure. Entering the water is forbidden in red flag areas. Lifeguards are patrolling.",
            category="weather",
            severity="danger",
            latitude=-22.9711,
            longitude=-43.1822,
            radius_km=8.0
        ),
        models.Alert(
            title="Street Crime Alert - Lapa District",
            description="Increase in snatch-and-grab street robberies targeting electronic devices (laptops, phones) in Lapa after midnight. Avoid walking alone. Keep cell phones stored out of sight and use inside venues only.",
            category="crime",
            severity="danger",
            latitude=-22.9133,
            longitude=-43.1818,
            radius_km=1.5
        ),
        models.Alert(
            title="Localized Air Quality Alert (PM2.5)",
            description="Air Quality Index (AQI) has reached 165 (Unhealthy) due to static dust. Individuals with respiratory issues are advised to wear protective masks and limit high-intensity outdoor cardio exercises.",
            category="health",
            severity="info",
            latitude=30.05,
            longitude=31.24,
            radius_km=15.0
        )
    ]
    
    for a in alerts:
        db.add(a)

    # 4. Seed Emergency Contacts for Testing
    print("Seeding default emergency contact...")
    default_contact = models.EmergencyContact(
        name="Sarah Miller",
        phone="+1-555-0199",
        email="sarah.miller@example.com",
        relation="Spouse/Partner",
        user_id="default_user"
    )
    db.add(default_contact)
    
    db.commit()
    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_db()
