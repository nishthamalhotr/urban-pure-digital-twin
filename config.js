// Data & Dimension Configuration for Urban Pure 250 KLD STP Digital Twin v2.4
const STP_CONFIG = {
  container: {
    dimensions: "12.192 m × 2.438 m × 2.900 m",
    capacity: "250 KLD",
    version: "Digital Twin Engine v2.4 - Mass Balance & Hydraulics",
    status: "ONLINE"
  },
  pumps: [
    { 
      id: "pump_inlet", 
      name: "1. Inlet Lift Pump (Sum Pump)", 
      type: "water_pump",
      sourceTank: -1, // External source
      targetTank: 0,  // Inlet & Pre-Treatment
      defaultHP: 5.0, 
      pipe: 3.0, 
      bends: 3,
      capacityLiters: 2931 
    },
    { 
      id: "pump_transfer", 
      name: "2. Tube Settler Transfer Pump", 
      type: "water_pump",
      sourceTank: 0, 
      targetTank: 1,  // Tube Settler / Sludge Tank
      defaultHP: 3.0, 
      pipe: 3.0, 
      bends: 2,
      capacityLiters: 10499 
    },
    { 
      id: "gravity_flow", 
      name: "Gravity Line (Settler -> Anoxic)", 
      type: "gravity",
      sourceTank: 1, 
      targetTank: 2,  // Anoxic Tank
      defaultHP: 0.0, 
      pipe: 3.0, 
      bends: 1,
      capacityLiters: 6363 
    },
    { 
      id: "pump_mbr", 
      name: "3. MBR Permeate Suction Pump", 
      type: "water_pump",
      sourceTank: 2, 
      targetTank: 3,  // MBR Basin
      defaultHP: 5.0, 
      pipe: 2.0, 
      bends: 2,
      capacityLiters: 22908 
    },
    { 
      id: "pump_backwash", 
      name: "4. MBR Backwash Pump (Silt Flush)", 
      type: "backwash_pump",
      sourceTank: 3, 
      targetTank: 2,  // Reverses flow to flush membrane
      defaultHP: 7.5, 
      pipe: 2.5, 
      bends: 4,
      capacityLiters: 5000 
    },
    { 
      id: "pump_ozone", 
      name: "5. Filter & Ozone Assembly Pump", 
      type: "water_pump",
      sourceTank: 3, 
      targetTank: 4,  // Filter & Ozone Assembly
      defaultHP: 0.5, 
      pipe: 0.75, 
      bends: 5,
      capacityLiters: 19089 
    },
    { 
      id: "pump_discharge", 
      name: "6. Treated Water Discharge Pump", 
      type: "water_pump",
      sourceTank: 4, 
      targetTank: 5,  // Treated Water Tank
      defaultHP: 3.0, 
      pipe: 3.0, 
      bends: 2,
      capacityLiters: 7000 
    },
    { 
      id: "blower_submerged", 
      name: "Submerged Air Blowers (AB-42)", 
      type: "blower",
      defaultHP: 5.5, 
      airFlow: "160 m³/hr" 
    }
  ],
  sections: [
    {
      id: "inlet_trio",
      title: "1. Inlet & Pre-Treatment Section",
      dims: "0.786 m × 2.438 m × 1.700 m",
      geometricVol: "3.26 m³ (3,257 L)",
      maxOperatingVol: "2.93 m³ (2,931 L)",
      description: "Transverse side-by-side compartment configuration across container width.",
      equipment: [
        { name: "Oil & Grease Tank", spec: "786 x 800 x 1700 mm | Inlet Pump: Sum Pump 3700 CW (5 HP)" },
        { name: "EBR Tank", spec: "786 x 800 x 1700 mm | Rectifier: RPS-IGBT-0-36V/350A" },
        { name: "Poly-Electrolyte Box", spec: "786 x 800 x 1700 mm | Dosing: Milton Roy UC-12" }
      ],
      metrics: { "Inlet Flow (DN80)": "173.3 LPM", "Water Level": "0 %" }
    },
    {
      id: "tube_settler",
      title: "2. Tube Settler / Sludge Tank",
      dims: "2.438 m × 1.650 m × 2.900 m",
      geometricVol: "11.67 m³ (11,666 L)",
      maxOperatingVol: "10.50 m³ (10,499 L)",
      description: "High-efficiency solids-liquid separation unit using inclined PVC tube decks.",
      equipment: [{ name: "Settling Media", spec: "PVC Tube Deck Module" }],
      metrics: { "Turbidity": "210 NTU", "Sludge Level": "0 %" }
    },
    {
      id: "anoxic_tank",
      title: "3. Anoxic Tank (Gravity Fed)",
      dims: "2.438 m × 1.000 m × 2.900 m",
      geometricVol: "7.07 m³ (7,070 L)",
      maxOperatingVol: "6.36 m³ (6,363 L)",
      description: "Denitrification basin for biological nitrogen removal prior to MBR.",
      equipment: [{ name: "Submerged Blowers", spec: "AB-42 Blowers (Air Scour)" }],
      metrics: { "pH": "7.2 pH", "DO": "0.3 mg/L" }
    },
    {
      id: "mbr_basin",
      title: "4. MBR Basin (Membrane Bioreactor)",
      dims: "2.438 m × 3.600 m × 2.900 m",
      geometricVol: "25.45 m³ (25,453 L)",
      maxOperatingVol: "22.91 m³ (22,908 L)",
      description: "Ultrafiltration membrane basin providing high-clarity permeate extraction.",
      equipment: [{ name: "Membrane Modules", spec: "54x Hollow Fiber Modules" }],
      metrics: { "MLSS": "8,500 mg/L", "TMP": "-0.28 bar" }
    },
    {
      id: "filter_ozone_assembly",
      title: "5. Filter & Ozone Assembly",
      dims: "2.438 m × 3.000 m × 2.900 m",
      geometricVol: "21.21 m³ (21,210 L)",
      maxOperatingVol: "19.09 m³ (19,089 L)",
      description: "Tertiary treatment stage featuring media filtration and ozonation disinfection.",
      equipment: [{ name: "Multigrade Filter", spec: 'SS304 Vessel (24" x 72")' }],
      metrics: { "Outlet Turbidity": "0.8 NTU", "Effluent COD": "28 mg/L" }
    },
    {
      id: "treated_water_tank",
      title: "6. Treated Water Tank",
      dims: "2.438 m × 1.100 m × 2.900 m",
      geometricVol: "7.78 m³ (7,777 L)",
      maxOperatingVol: "7.00 m³ (7,000 L)",
      description: "Final effluent collection basin for treated water storage prior to discharge.",
      equipment: [{ name: "Discharge Pumps", spec: "Treated Water Outflow Line" }],
      metrics: { "Storage Volume": "0.0 m³", "Final pH": "7.3 pH" }
    }
  ]
};