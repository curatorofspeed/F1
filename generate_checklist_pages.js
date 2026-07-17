#!/usr/bin/env node
/* ============================================================
   F1 Card Index — driver checklist page generator
   Usage:  node tools/generate_checklist_pages.js
   Emits:  <slug>.html at repo root (one per driver below)
   Template: tools/checklist-template.html
   Curation rule: seed only sale- or checklist-verified rows.
   Gaps are expandable in-page via "+ Add".
   ============================================================ */
const fs=require('fs'),path=require('path');
const P=(p,pr,x)=>({p,pr:pr||0,x:x||""});
const C=(no,name,type,pars,rc)=>({no,name,type,pars,rc:!!rc});

/* ---------------- shared parallel ladders ---------------- */
const CHROME20=[P("Base"),P("Refractor"),P("Purple Refractor",399),P("Gold Refractor",50),P("Gold Wave Refractor",50),
P("Orange Refractor",25),P("Orange Wave Refractor",25),P("Red Refractor",5),P("Red Wave Refractor",5),
P("70th Anniversary Gold",0,"70th"),P("70th Anniversary Orange",0,"70th"),P("70th Anniversary Red",0,"70th"),
P("70th Anniversary SuperFractor",1,"70th"),P("SuperFractor",1),P("Printing Plates C/M/Y/K",-4)];
const AUTO20=[P("Base Auto"),P("Green Refractor",99),P("Gold Refractor",50),P("Gold Wave Refractor",50),
P("Orange Refractor",25),P("Red Refractor",5),P("SuperFractor",1),P("Printing Plates C/M/Y/K",-4)];
const SAPP20=[P("Base Sapphire"),P("Aqua",99),P("70th Anniversary",70),P("Gold",50),P("Orange",25),
P("Purple",10),P("Red",5),P("Padparadscha",1)];

const CHROME24=[P("Base"),P("Refractor"),P("Sepia Refractor",0,"Value"),P("B&W RayWave Refractor",0,"QL"),
P("Checker Flag X-Fractor"),P("Purple/Green Refractor"),P("Gold/Purple Refractor"),P("Orange/Red Refractor"),
P("Red/Green Refractor"),P("Mini-Diamond Refractor",299),P("Fuchsia Lava Refractor",225),
P("Purple Checker Flag X-Fractor",199,"Hobby"),P("Aqua Sonar Refractor",150),P("Green Refractor",99),
P("Green RayWave Refractor",99,"QL"),P("Pink Refractor",75),P("Pink RayWave Refractor",75,"QL"),
P("Gold Refractor",50),P("Gold RayWave Refractor",50,"QL"),P("Gold Checker Flag X-Fractor",50,"Hobby"),
P("Orange Refractor",25),P("Orange Checker Flag X-Fractor",25,"Hobby"),P("Black Refractor",10),
P("Red Refractor",5),P("Red Checker Flag X-Fractor",5,"Hobby"),P("SuperFractor",1),P("Printing Plates C/M/Y/K",-4)];
const AUTO24=[P("Base Auto"),P("Green Refractor",99),P("Gold Refractor",50),P("Orange Refractor",25),
P("Red Refractor",5),P("SuperFractor",1)];
const LOGO=[P("LogoFractor"),P("Green LogoFractor",99),P("Gold LogoFractor",50),P("Orange LogoFractor",25),
P("Black LogoFractor",10),P("Red LogoFractor",5),P("Rose Gold LogoFractor",1)];
const SAPP=[P("Base Sapphire"),P("Aqua",99),P("Gold",50),P("Orange",25),P("B&W",20),P("Padparadscha",1)];

const CHROME25=[P("Base"),P("Refractor"),P("B&W RayWave Refractor",0,"Value"),P("B&W Lazer Refractor",0,"Hobby"),
P("Checker Flag Refractor"),P("Teal Refractor",299),P("Pink Refractor",250),P("Aqua Refractor",199),
P("Blue Refractor",150),P("Green Refractor",99),P("F1 75th Anniversary Refractor",75,"Hobby"),
P("Gold Refractor",50),P("Gold Checker Flag Refractor",50,"Hobby"),P("Orange Refractor",25),
P("Orange Checker Flag Refractor",25,"Hobby"),P("Black Refractor",10),P("Red Refractor",5),
P("Red Checker Flag Refractor",5,"Hobby"),P("SuperFractor",1),P("Printing Plates C/M/Y/K",-4)];
const INSERT25=[P("Base"),P("Aqua Refractor",199),P("Blue Refractor",150),P("Green Refractor",99),
P("F1 75th Anniversary Refractor",75,"Hobby"),P("Gold Refractor",50),P("Orange Refractor",25),
P("Black Refractor",10),P("Red Refractor",5),P("SuperFractor",1)];
const AUTO25=[P("Base Auto"),P("Green Refractor",99),P("F1 75th Anniversary Refractor",75,"Hobby"),
P("Gold Refractor",50),P("Orange Refractor",25),P("Black Refractor",10),P("Red Refractor",5),
P("Orange RayWave Refractor",25,"Value"),P("Black RayWave Refractor",10,"Value"),
P("Red RayWave Refractor",5,"Value"),P("SuperFractor",1)];
const MINID=[P("Night Vision Mini-Diamond",299),P("Purple Mini-Diamond",199),P("Blue Mini-Diamond",150),
P("Green Mini-Diamond",99),P("Gold Mini-Diamond",50),P("Orange Mini-Diamond",25),P("Red Mini-Diamond",5),
P("SuperFractor",1)];
const SP25=[P("Base"),P("Orange Refractor",25),P("Red Refractor",5),P("SuperFractor",1)];
const LOGOF175=[P("Base"),P("Black Refractor",10),P("Red Refractor",5),P("SuperFractor",1)];
const LOGO25=[P("LogoFractor"),P("Yellow LogoFractor",75),P("Gold LogoFractor",50),P("Orange LogoFractor",25),
P("Black LogoFractor",10),P("Red LogoFractor",5),P("Rose Gold LogoFractor",1)];
const SAPP25=[P("Base Sapphire"),P("Aqua",99),P("Gold",50),P("Orange",25),P("B&W",20),P("Red",5),P("Padparadscha",1)];

/* ---------------- drivers ---------------- */
const DRIVERS=[
{
  slug:"kimi-antonelli-card-checklist", first:"Kimi", last:"Antonelli", full:"Andrea Kimi Antonelli",
  number:12, team:"Mercedes-AMG Petronas", accent:"#00D2BE", accentD:"#0a8a7c",
  key:"antonelli-index-v1",
  pulse:"RECORD · $201,910 — Dynasty Racing Glove Jumbo Patch Auto 1/1 · 7th most expensive F1 card ever (Goldin, Apr 2026)",
  prov:"seeded from Topps official odds sheets and checklist databases, verified Jul 2026. 2024 Chrome ladder per Topps Checklist Spotlight; 2025 Chrome ladder per official odds. 2025 Sapphire parallels mirror the 2024 Sapphire structure (Red /5 confirmed by sale) — verify against the official odds sheet and edit rows as needed. Stub sets (Turbo Attax, flagship, Topps Now) are expandable via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10 (Goldin / eBay / Fanatics records) — update both from one array.",
  topsales:[
{card:'2025 Dynasty F1 Racing Glove Jumbo Patch Auto #AFJPV-AAN · 1/1',grade:'Raw',price:201910,date:'2026-04-11',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-racing-glove-jumbo-patch-autograph-afjpv-aan-kimd0y6c'},
{card:'2025 Dynasty F1 Suit Zipper Jumbo Patch Auto #AFJPV-AAN · 1/1',grade:'Raw',price:111000.48,date:'2026-03-14',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-suit-zipper-jumbo-patch-autograph-gold-afjpv-aanq12bv'},
{card:'2025 Chrome F1 Auto Red Refractor #CAC-ANT · 5/5',grade:'PSA 10',price:90890,date:'2026-06-06',source:'Goldin',url:'https://goldin.co/item/2025-topps-chrome-f1-autographs-red-refractor-cac-ant-kimi-antonelli-s3529a'},
{card:'2025 Chrome Sapphire F1 Red #8 RC · 3/5',grade:'PSA 10',price:79300,date:'2026-06-25',source:'Goldin',url:'https://goldin.co/item/2025-topps-chrome-sapphire-edition-red-8-kimi-antonelli-rookie-card-3kjclc'},
{card:'2025 Dynasty F1 Patch Auto Gold #DAP-AANII · 1/1',grade:'Raw',price:64050,date:'2026-03-19',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-patch-autograph-dap-aaniii-kimi-antonelli-signedxaj6v'},
{card:'2025 Dynasty F1 Patch Auto Gold #DAP-AANIII · 1/1',grade:'Raw',price:51240,date:'2026-03-05',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-patch-autograph-dap-aaniii-kimi-antonelli-signedax9eb'},
{card:'2025 Dynasty F1 Patch Auto #DAP-AANIV · 1/1',grade:'Raw',price:41480,date:'2026-03-26',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-patch-autograph-dap-aaniv-kimi-antonelli-signed6h5ns'},
{card:'2025 Eccellenza F1 Glove Relic Gold · 1/1',grade:'Raw',price:35000,date:'2026-06-15',source:'eBay',url:'https://www.ebay.com/itm/188505186294'},
{card:'2025 Chrome F1 RC #8 Red Checkered · /5',grade:'PSA 10',price:29750,date:'2026-06-09',source:'eBay',url:'https://www.ebay.com/itm/137363695501'},
{card:'2025 Dynasty F1 Red Rookie Patch Auto #DAP-AANi · 4/5',grade:'Raw',price:29400,date:'2026-06-07',source:'Fanatics',url:'https://www.fanaticscollect.com/weekly/3eebe87e-595e-11f1-87d2-0259a6df3a4f'},
{card:'2025 Dynasty F1 Dual Relic Auto Red #SDDRA-AAN · 1/5',grade:'Raw',price:26840,date:'2026-03-19',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-single-driver-dual-relic-autographs-red-sddra-aa358cy'}
  ],
  db:[
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1",meta:"Nov 2024 · first Chrome cards · F2 season",cards:[
  C("22","F2 Future Stars · Prema","Base",CHROME24),
  C("94","F2 Drivers · Prema","Base",CHROME24),
  C("CAC-ANT","Chrome Autograph","Auto",AUTO24)]},
{set:"2024 Topps Chrome LogoFractor F1",q:"2024 Topps Chrome LogoFractor Antonelli",meta:"Dec 2024 · same checklist, LogoFractor stock",cards:[
  C("22","F2 Future Stars · LogoFractor","Base",LOGO),
  C("94","F2 Drivers · LogoFractor","Base",LOGO)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire F1 Antonelli",meta:"Sapphire treatment of the 2024 checklist",cards:[
  C("22","F2 Future Stars · Sapphire","Base",SAPP),
  C("94","F2 Drivers · Sapphire","Base",SAPP)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Antonelli",meta:"Jan 2026 · THE flagship F1 rookie card · #8 Mercedes",cards:[
  C("8","F1 Drivers · Mercedes-AMG Petronas","Base",CHROME25,1),
  C("8 IV","Image Variation SSP (1:2,881 — no parallels)","Base",[P("Image Variation SSP")],1),
  C("80","F1 Cars · Mercedes","Base",CHROME25),
  C("167","F1 Duo · with Russell","Base",CHROME25),
  C("185","F1 On The Move","Base",CHROME25),
  C("SD-1","Speed Demons","Insert",INSERT25),
  C("HC-1","Helmet Collection","Insert",INSERT25),
  C("FUT-ANT","Futuro","Insert",SP25),
  C("VGS-3","Vegas at Night SP","Insert",SP25),
  C("NN-4","Neon Nations SP","Insert",SP25),
  C("LOGO-12","F175 Anniversary Logo","Insert",LOGOF175),
  C("TS-4","Top Speed","Insert",[P("Base",0,"Value"),P("SuperFractor",1)]),
  C("D75-8","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-28","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-KIM","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)]),
  C("CAC-ANT","Chrome Autograph","Auto",AUTO25)]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Antonelli",meta:"Mega box exclusive · same checklist",cards:[
  C("8","F1 Drivers · LogoFractor RC","Base",LOGO25,1),
  C("SD-1","Speed Demons · LogoFractor","Insert",LOGO25),
  C("HC-1","Helmet Collection · LogoFractor","Insert",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Antonelli",meta:"Feb 2026 · premium Sapphire RC",
 note:"Red /5 confirmed by a $79,300 PSA 10 sale. Rest mirrors 2024 Sapphire — verify vs odds sheet.",cards:[
  C("8","F1 Drivers · Sapphire RC","Base",SAPP25,1),
  C("SS-4","Sapphire Selections","Insert",[P("Base Sapphire")]),
  C("SD-1","Speed Demons · Sapphire","Insert",[P("Base Sapphire")]),
  C("HC-1","Helmet Collection · Sapphire","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Antonelli",meta:"Ultra high end · on-card auto + race-used memorabilia",
 note:"Codes from recorded sales. /10 base runs follow Dynasty convention — verify.",cards:[
  C("AFJPV-AAN","Jumbo Patch Autograph Variations","Auto",[P("Racing Glove Patch",1),P("Suit Zipper Patch",1)],1),
  C("DAP-AAN I–IV","Autograph Patch · four variations","Auto",[P("Base",10),P("Red",5),P("Gold",1)],1),
  C("SDDRA-AAN","Single Driver Dual Relic Autograph","Auto",[P("Base",10),P("Red",5)])]},
{set:"2025 Topps Eccellenza F1",q:"2025 Topps Eccellenza Antonelli",meta:"Premium relic line — expand via + Add",cards:[
  C("GLOVE","Glove Relic","Relic",[P("Gold",1)])]},
{set:"2025 Topps Now F1",q:"Topps Now F1 Antonelli",meta:"Moment cards — add card #s + parallels as issued",cards:[
  C("TN","F1 debut · P4 Melbourne","Base",[P("Base")]),
  C("TN","Youngest to lead a lap + fastest lap · Suzuka","Base",[P("Base")]),
  C("TN","Sprint pole · Miami","Base",[P("Base")]),
  C("TN","First podium · P3 Montréal","Base",[P("Base")])]},
{set:"2026 Topps Now F1",q:"Topps Now F1 Antonelli",meta:"Moment cards — add #s as issued",cards:[
  C("TN","FIRST WIN · Chinese GP Shanghai · 2nd-youngest F1 winner ever","Base",[P("Base")]),
  C("TN","Back-to-back · Japanese GP win","Base",[P("Base")]),
  C("TN","Championship lead · first Italian on top since 2005","Base",[P("Base")])]},
{set:"Other Topps — expand via + Add",q:"Topps Antonelli",meta:"Turbo Attax · flagship",cards:[
  C("—","2024 Turbo Attax F2 base + LE variants","Base",[P("Base")]),
  C("—","2025 Turbo Attax Mercedes base + LE variants","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")])]}
  ]
},
{
  slug:"max-verstappen-card-checklist", first:"Max", last:"Verstappen", full:"Max Verstappen",
  number:1, team:"Oracle Red Bull Racing", accent:"#3671C6", accentD:"#24518f",
  key:"verstappen-index-v1",
  pulse:"RECORD · $534,000 — 2020 Chrome Auto SuperFractor 1/1, PSA 9 (Goldin, 2022)",
  prov:"seeded from Topps official checklists and odds sheets (2020, 2024, 2025 verified Jul 2026) plus recorded auction sales. 2020 Chrome is the first Topps Chrome F1 set — Verstappen base #6, auto #F1A-MV. 2021–2023 sets are seeded with sale-confirmed grails only; expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10 — update both from one array.",
  topsales:[
{card:'2020 Chrome F1 Auto SuperFractor #F1A-MV · 1/1',grade:'PSA 9',price:534000,date:'2022-08-06',source:'Goldin',url:'https://goldin.co/item/2020-topps-chrome-f1-superfractor-f1a-mv-max-verstappen-signed-rookiep1eai'},
{card:'2020 Chrome F1 Sapphire Padparadscha #6 · 1/1',grade:'PSA 9',price:336000,date:'2023-03-16',source:'Fanatics',url:'https://goldin.co/item/2020-topps-chrome-formula-1-sapphire-edition-padparadscha-1-1-6-max-vejpien'},
{card:'2020 Dynasty F1 Auto Patch Gold #DAP-MV · 1/1',grade:'PSA 10',price:170400,date:'2022-08-06',source:'Goldin',url:'https://goldin.co/item/2020-topps-f1-dynasty-gold-dap-mv-max-verstappen-signed-rookie-patch-cteusz'},
{card:'2020 Chrome F1 Auto Red Refractor #F1A-MV',grade:'PSA 9',price:90000,date:'2022-06-25',source:'Goldin',url:'https://goldin.co/item/2020-topps-chrome-f1-autographs-red-refractor-f1a-mv-max-verstappen-sirim4i'},
{card:'2025 Dynasty F1 Triple Relic Auto Gold #SDTRA-MVE · 1/1',grade:'Raw',price:79301.22,date:'2026-03-07',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-triple-relic-autographs-gold-sdtra-mve-max-versth6akw'},
{card:'2020 Chrome F1 Sapphire SP Red #6',grade:'PSA 9',price:43200,date:'2022-10-22',source:'Goldin'},
{card:'2020 Dynasty F1 Dual Relic Auto #SDA-MV · /10',grade:'Raw',price:41480,date:'2026-06-06',source:'Goldin'},
{card:'2025 Dynasty F1 Jumbo Suit Zipper Auto #AFJPV-MVE · 1/1',grade:'BGS 8.5',price:41478.78,date:'2026-04-11',source:'Goldin'},
{card:'2020 Dynasty F1 Auto Glove Relic #AFPMV · /10',grade:'PSA 8',price:40200,date:'2022-09-10',source:'Goldin'},
{card:'2021 Dynasty F1 Auto Suit Flag Jumbo Patch #AFJP-MV · 1/1',grade:'Raw',price:39600,date:'2022-08-06',source:'Goldin'},
{card:'2020 Dynasty F1 Auto Patch #DAP-IIMV',grade:'PSA 10',price:38491,date:'2025-04-26',source:'Goldin'},
{card:'2021 Chrome F1 Auto SuperFractor #CA-MV · 1/1',grade:'PSA 9',price:37820,date:'2024-06-08',source:'Goldin'}
  ],
  db:[
{set:"2020 Topps Chrome F1",q:"2020 Topps Chrome F1 Verstappen",meta:"Apr 2021 · the inaugural Chrome F1 set · #6 Red Bull",cards:[
  C("6","F1 Drivers · first Topps Chrome","Base",CHROME20),
  C("6 IV","Image Variation SP (seated portrait)","Base",[P("Image Variation SP")]),
  C("F1A-MV","Chrome Autograph","Auto",AUTO20)]},
{set:"2020 Topps Chrome Sapphire F1",q:"2020 Topps Chrome Sapphire Verstappen",meta:"May 2021 · Topps.com exclusive",cards:[
  C("6","F1 Drivers · Sapphire","Base",SAPP20),
  C("6 IV","Image Variation SP · Sapphire","Base",SAPP20)]},
{set:"2020 Topps Dynasty F1",q:"2020 Topps Dynasty F1 Verstappen",meta:"The first Dynasty F1 · on-card auto + patch",
 note:"Codes from recorded sales. /10 base runs follow Dynasty convention — verify.",cards:[
  C("DAP-MV I/II","Dynasty Autograph Patch · two variations","Auto",[P("Base",10),P("Gold",1)]),
  C("AFP-MV","Autographed Glove Relic","Auto",[P("Base",10)]),
  C("SDA-MV","Single Driver Dual Relic Autograph","Auto",[P("Base",10)])]},
{set:"2021–2023 career sets — expand via + Add",q:"Topps F1 Verstappen",meta:"Sale-confirmed grails seeded; full ladders via + Add",cards:[
  C("CA-MV","2021 Chrome Autograph","Auto",[P("Base Auto"),P("SuperFractor",1)]),
  C("AFJP-MV","2021 Dynasty Suit Flag Jumbo Patch Auto","Auto",[P("Base",1)]),
  C("—","2022–2023 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Verstappen",meta:"Nov 2024 · four-time champion season",cards:[
  C("1","F1 Drivers · Red Bull","Base",CHROME24)]},
{set:"2024 Topps Chrome LogoFractor F1",q:"2024 Topps Chrome LogoFractor Verstappen",meta:"Same checklist, LogoFractor stock",cards:[
  C("1","F1 Drivers · LogoFractor","Base",LOGO)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Verstappen",meta:"Sapphire treatment of the 2024 checklist",cards:[
  C("1","F1 Drivers · Sapphire","Base",SAPP)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Verstappen",meta:"Jan 2026 · card #1 of the 75th-anniversary flagship",cards:[
  C("1","F1 Drivers · Oracle Red Bull Racing","Base",CHROME25),
  C("73","F1 Cars · Red Bull","Base",CHROME25),
  C("164","F1 Duo · with Tsunoda","Base",CHROME25),
  C("113","Grand Prix Winners","Base",CHROME25),
  C("115","Grand Prix Winners","Base",CHROME25),
  C("117","Pole Position","Base",CHROME25),
  C("142","Grand Prix Driver of the Day","Base",CHROME25),
  C("148","F1 Award Winners","Base",CHROME25),
  C("SCA-3","Ace of Trades","Insert",INSERT25),
  C("TS-1","Top Speed","Insert",[P("Base",0,"Value"),P("SuperFractor",1)]),
  C("VGS-4","Vegas at Night SP","Insert",SP25),
  C("LOGO-1","F175 Anniversary Logo","Insert",LOGOF175),
  C("D75-1","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-21","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-VER","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)]),
  C("Grail No.1–3","The Grail · 2024 top-3 puzzle (prize golds not in packs)","Insert",[P("No.1"),P("No.2"),P("No.3")])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Verstappen",meta:"Mega box exclusive",cards:[
  C("1","F1 Drivers · LogoFractor","Base",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Verstappen",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the Antonelli-verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("1","F1 Drivers · Sapphire","Base",SAPP25),
  C("IS-1","Sapphire insert","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Verstappen",meta:"Ultra high end · on-card auto + race-used memorabilia",
 note:"Codes from recorded sales — expand via + Add.",cards:[
  C("SDTRA-MVE","Triple Relic Autograph","Auto",[P("Gold",1)]),
  C("AFJPV-MVE","Jumbo Patch Autograph Variations","Auto",[P("Suit Zipper Patch",1)])]},
{set:"Other Topps — expand via + Add",q:"Topps Verstappen",meta:"Turbo Attax · flagship · Topps Now",cards:[
  C("—","Turbo Attax base + LE variants (2020–2025)","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"lando-norris-card-checklist", first:"Lando", last:"Norris", full:"Lando Norris",
  number:4, team:"McLaren", accent:"#FF8000", accentD:"#b35a00",
  key:"norris-index-v1",
  pulse:"RECORD · $32,330 — 2020 Chrome Auto Red Refractor #F1A-LN, PSA 10 (Goldin, Sep 2024)",
  prov:"seeded from Topps official checklists and odds sheets (2020, 2024, 2025 verified Jul 2026) plus recorded auction sales. Norris carries the deepest 2025 subset presence on the grid — twelve base-checklist cards. 2021–2023 sets seeded with sale-confirmed grails only; expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10 — update both from one array.",
  topsales:[
{card:'2020 Chrome F1 Auto Red Refractor #F1A-LN',grade:'PSA 10',price:32330,date:'2024-09-28',source:'Goldin',url:'https://goldin.co/item/2020-topps-chrome-f1-autograph-red-refractor-ln-lando-norris-signed-rojnpuo'},
{card:'2020 Dynasty F1 RC Gold Jumbo Zipper 1/1',grade:'Raw',price:26990,date:'2025-10-21',source:'eBay',url:'https://ebay.com/itm/267408347079?nordt=true'},
{card:'2020 Dynasty F1 Auto Patch Gold #DAP-IVLN 1/1',grade:'Raw',price:16800,date:'2022-07-16',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-f1-dap-ivln-lando-norris-rookie-patch-autograph-1-18clj1'},
{card:'2020 Dynasty F1 Rookie Zipper RPA 1/1',grade:'Raw',price:15000,date:'2025-04-24',source:'Fanatics',url:'https://www.fanaticscollect.com/premier/855c4dc4-164a-11f0-aa26-0a58a9feac02'},
{card:'2025 F1 Fanatics Fest Auto Foilfractor #12A 1/1',grade:'PSA 9',price:15000,date:'2025-12-14',source:'eBay',url:'https://ebay.com/itm/127564213540?nordt=true'},
{card:'2020 Dynasty F1 Single-Driver Auto Dual Relic Red /5',grade:'PSA 10',price:15000,date:'2026-05-24',source:'Fanatics',url:'https://www.fanaticscollect.com/weekly/b944abcc-4d9e-11f1-b7ce-027004a3c7d9'},
{card:'2025 Dynasty F1 Auto Patch Gold #DAP-LNOVII 1/1',grade:'Raw',price:13420,date:'2026-01-08',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-formula-1-dap-lnovii-lando-norris-signed-patch-cardsg2ez'},
{card:'2020 Dynasty F1 Auto Patch #IILN',grade:'PSA 10',price:13200,date:'2026-05-21',source:'Fanatics',url:'https://www.fanaticscollect.com/premier/febe821c-4a5c-11f1-a1a3-0a29d58e95b1'},
{card:'2020 Chrome F1 Sapphire Red #7',grade:'PSA 9',price:12200,date:'2024-09-02',source:'Goldin'},
{card:'2025 Dynasty F1 Auto Patch Gold #DAP-LNOIII 1/1',grade:'Raw',price:12200,date:'2026-01-03',source:'Goldin'},
{card:'2021 Dynasty F1 Auto Suit Flag Jumbo Patch #AFJP-LN 1/1',grade:'Raw',price:12200,date:'2026-04-11',source:'Goldin'}
  ],
  db:[
{set:"2020 Topps Chrome F1",q:"2020 Topps Chrome F1 Norris",meta:"Apr 2021 · the inaugural Chrome F1 set · #7 McLaren",cards:[
  C("7","F1 Drivers · first Topps Chrome","Base",CHROME20),
  C("7 IV","Image Variation SP (seated portrait)","Base",[P("Image Variation SP")]),
  C("F1A-LN","Chrome Autograph","Auto",AUTO20)]},
{set:"2020 Topps Chrome Sapphire F1",q:"2020 Topps Chrome Sapphire Norris",meta:"May 2021 · Topps.com exclusive",cards:[
  C("7","F1 Drivers · Sapphire","Base",SAPP20),
  C("7 IV","Image Variation SP · Sapphire","Base",SAPP20)]},
{set:"2020 Topps Dynasty F1",q:"2020 Topps Dynasty F1 Norris",meta:"The first Dynasty F1 · on-card auto + patch",
 note:"Codes and runs from recorded sales; Dynasty convention where unstated — verify.",cards:[
  C("DAP-LN I–IV","Dynasty Autograph Patch · four variations","Auto",[P("Base",10),P("Gold",1)]),
  C("ZIPPER","Zipper Rookie Patch Autographs","Auto",[P("Rookie Zipper RPA",1),P("Gold Jumbo Zipper",1)]),
  C("SDA-LN","Single Driver Dual Relic Autograph","Auto",[P("Base",10),P("Red",5)])]},
{set:"2021–2023 career sets — expand via + Add",q:"Topps F1 Norris",meta:"Sale-confirmed grails seeded; full ladders via + Add",cards:[
  C("AFJP-LN","2021 Dynasty Suit Flag Jumbo Patch Auto","Auto",[P("Base",1)]),
  C("—","2021–2023 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Norris",meta:"Nov 2024 season",cards:[
  C("7","F1 Drivers · McLaren","Base",CHROME24)]},
{set:"2024 Topps Chrome LogoFractor F1",q:"2024 Topps Chrome LogoFractor Norris",meta:"Same checklist, LogoFractor stock",cards:[
  C("7","F1 Drivers · LogoFractor","Base",LOGO)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Norris",meta:"Sapphire treatment of the 2024 checklist",cards:[
  C("7","F1 Drivers · Sapphire","Base",SAPP)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Norris",meta:"Jan 2026 · twelve subset cards — most on the grid",cards:[
  C("5","F1 Drivers · McLaren","Base",CHROME25),
  C("5 IV","Image Variation SSP (1:2,881 — no parallels)","Base",[P("Image Variation SSP")]),
  C("77","F1 Cars · McLaren","Base",CHROME25),
  C("166","F1 Duo · with Piastri","Base",CHROME25),
  C("107","Grand Prix Winners","Base",CHROME25),
  C("110","Grand Prix Winners","Base",CHROME25),
  C("116","Pole Position","Base",CHROME25),
  C("120","Pole Position","Base",CHROME25),
  C("126","Grand Prix Driver of the Day","Base",CHROME25),
  C("127","Grand Prix Driver of the Day","Base",CHROME25),
  C("128","Grand Prix Driver of the Day","Base",CHROME25),
  C("130","Grand Prix Driver of the Day","Base",CHROME25),
  C("131","Grand Prix Driver of the Day","Base",CHROME25),
  C("132","Grand Prix Driver of the Day","Base",CHROME25),
  C("136","Grand Prix Driver of the Day","Base",CHROME25),
  C("147","F1 Award Winners","Base",CHROME25),
  C("SCA-4","Ace of Trades","Insert",INSERT25),
  C("VGS-5","Vegas at Night SP","Insert",SP25),
  C("HC-4","Helmet Collection","Insert",INSERT25),
  C("LOGO-7","F175 Anniversary Logo","Insert",LOGOF175),
  C("D75-5","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-25","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-NOR","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)]),
  C("Grail No.4–6","The Grail · 2024 top-3 puzzle (prize golds not in packs)","Insert",[P("No.4"),P("No.5"),P("No.6")])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Norris",meta:"Mega box exclusive",cards:[
  C("5","F1 Drivers · LogoFractor","Base",LOGO25),
  C("HC-4","Helmet Collection · LogoFractor","Insert",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Norris",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the Antonelli-verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("5","F1 Drivers · Sapphire","Base",SAPP25),
  C("IS-3","Sapphire insert","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Norris",meta:"Ultra high end · on-card auto + race-used memorabilia",
 note:"Codes from recorded sales — at least seven DAP-LNO variations exist. Expand via + Add.",cards:[
  C("DAP-LNO I–VII","Autograph Patch · seven variations","Auto",[P("Base",10),P("Gold",1)])]},
{set:"Other Topps — expand via + Add",q:"Topps Norris",meta:"Fanatics Fest · Turbo Attax · flagship · Topps Now",cards:[
  C("12A","2025 Fanatics Fest Chrome Autograph Foilfractor","Auto",[P("Foilfractor",1)]),
  C("—","Turbo Attax base + LE variants (2020–2025)","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"lewis-hamilton-card-checklist", first:"Lewis", last:"Hamilton", full:"Lewis Hamilton",
  number:44, team:"Scuderia Ferrari", accent:"#ED1C24", accentD:"#a31218",
  key:"hamilton-index-v1",
  pulse:"RECORD · ~$1,000,000 — 2020 Chrome SuperFractor Auto 1/1 (Dec 2024) · most expensive F1 card ever",
  prov:"seeded from Topps official checklists and odds sheets (2020, 2024, 2025 verified Jul 2026) plus recorded auction sales. Includes the pre-Topps 2006 Futera Grand Prix rookie — Hamilton\u2019s defining card. 2025 Chrome covers his first Ferrari-era cards including the six-card hard-signed special. 2021–2023 seeded via + Add. Top Values mirrors the F1 Card Index homepage Top 10 — update both from one array.",
  topsales:[
{card:'2020 Topps Chrome F1 Superfractor #1 · 1/1',grade:'PSA 7',price:900000,date:'2022-04-30',source:'Goldin',url:'https://goldin.co/item/2020-topps-chrome-f1-superfractor-1-lewis-hamilton-1-1-psa-nm-7f8ruj'},
{card:"2006 Futera Grand Prix 'Next' #95 Rookie",grade:'PSA 9',price:312000,date:'2022-03-13',source:'Goldin',url:'https://goldin.co/item/2006-futera-grand-prix-next-95-lewis-hamilton-rookie-card-psa-mint-9-pj71md'},
{card:"2006 Futera Grand Prix 'Next' #95 Rookie",grade:'PSA 9',price:292266,date:'2022-05-21',source:'Goldin',url:'https://goldin.co/item/2006-futera-grand-prix-next-95-lewis-hamilton-rookie-card-psa-mint-9r6tyj'},
{card:'2006 Futera Grand Prix #95 Rookie',grade:'PSA 9',price:204000,date:'2022-07-16',source:'Goldin',url:'https://goldin.co/item/2006-futera-grand-prix-95-lewis-hamilton-rookie-card-psa-mint-9-top-203sba2'},
{card:"2006 Futera Grand Prix 'Next' #95 Rookie",grade:'PSA 8',price:121200,date:'2022-04-09',source:'Goldin',url:'https://goldin.co/item/2006-futura-grand-prix-next-95-lewis-hamilton-rookie-card-psa-nm-mt-8ni3pj'},
{card:'2025 Topps Dynasty F1 Auto Flag/Suit Nameplate #DAF-LHA · 2/2',grade:'Raw',price:106750,date:'2026-04-11',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-autographed-flag-suit-nameplates-daf-lha-lewis-h8nubg'},
{card:'2025 Topps Dynasty F1 Triple Relic Auto Gold #SDTRA-LH · 1/1',grade:'Raw',price:100040,date:'2026-03-07',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-triple-relic-autographs-gold-sdtra-lh-lewis-hamiv4e01'},
{card:'2020 Topps Dynasty F1 Auto Patch Red #DAP-IILH · 4/5',grade:'Raw',price:90000,date:'2022-05-21',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-formula-1-dap-iilh-lewis-hamilton-signed-patch-cardtrug3'},
{card:'2020 Topps Dynasty F1 Auto Suit Zipper Relic #AFP-LH · 1/4',grade:'Raw',price:78000,date:'2022-08-06',source:'Goldin'}
  ],
  db:[
{set:"2006 Futera Grand Prix — pre-Topps rookie",q:"2006 Futera Grand Prix Hamilton 95",meta:"The defining Hamilton rookie · #95",
 note:"Not a Topps product — included because it anchors the Hamilton market. Expand parallels via + Add.",cards:[
  C("95","GP2-era rookie card","Base",[P("Base")])]},
{set:"2020 Topps Chrome F1",q:"2020 Topps Chrome F1 Hamilton",meta:"Apr 2021 · card #1 of the inaugural Chrome F1 set",cards:[
  C("1","F1 Drivers · Mercedes · card #1 of the set","Base",CHROME20),
  C("1 IV","Image Variation SP (seated portrait)","Base",[P("Image Variation SP")]),
  C("F1A-LH","Chrome Autograph","Auto",AUTO20)]},
{set:"2020 Topps Chrome Sapphire F1",q:"2020 Topps Chrome Sapphire Hamilton",meta:"May 2021 · Topps.com exclusive",cards:[
  C("1","F1 Drivers · Sapphire","Base",SAPP20),
  C("1 IV","Image Variation SP · Sapphire","Base",SAPP20)]},
{set:"2020 Topps Dynasty F1",q:"2020 Topps Dynasty F1 Hamilton",meta:"The first Dynasty F1 · on-card auto + patch",
 note:"Codes and runs from recorded sales (AFP-LH runs /4).",cards:[
  C("DAP-LH I/II","Dynasty Autograph Patch · two variations","Auto",[P("Base",10),P("Red",5),P("Gold",1)]),
  C("AFP-LH","Autographed Suit Zipper Relic","Auto",[P("Base",4)])]},
{set:"2021–2023 career sets — expand via + Add",q:"Topps F1 Hamilton",meta:"Full ladders via + Add",cards:[
  C("—","2021–2023 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Hamilton",meta:"Nov 2024 · final Mercedes season",cards:[
  C("6","F1 Drivers · Mercedes","Base",CHROME24)]},
{set:"2024 Topps Chrome LogoFractor F1",q:"2024 Topps Chrome LogoFractor Hamilton",meta:"Same checklist, LogoFractor stock",cards:[
  C("6","F1 Drivers · LogoFractor","Base",LOGO)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Hamilton",meta:"Sapphire treatment of the 2024 checklist",cards:[
  C("6","F1 Drivers · Sapphire","Base",SAPP)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Hamilton",meta:"Jan 2026 · first Ferrari-era Chrome cards",cards:[
  C("4","F1 Drivers · Scuderia Ferrari","Base",CHROME25),
  C("4 IV","Image Variation SSP (1:2,881 — no parallels)","Base",[P("Image Variation SSP")]),
  C("76","F1 Cars · Ferrari","Base",CHROME25),
  C("165","F1 Duo · with Leclerc","Base",CHROME25),
  C("104","Grand Prix Winners","Base",CHROME25),
  C("106","Grand Prix Winners","Base",CHROME25),
  C("133","Grand Prix Driver of the Day","Base",CHROME25),
  C("135","Grand Prix Driver of the Day","Base",CHROME25),
  C("143","Grand Prix Driver of the Day","Base",CHROME25),
  C("TS-2","Top Speed","Insert",[P("Base",0,"Value"),P("SuperFractor",1)]),
  C("VGS-2","Vegas at Night SP","Insert",SP25),
  C("SD-2","Speed Demons","Insert",INSERT25),
  C("HC-2","Helmet Collection","Insert",INSERT25),
  C("LOGO-6","F175 Anniversary Logo","Insert",LOGOF175),
  C("D75-4","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-24","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-HAM","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)]),
  C("HAM-HS","Hard-Signed Special · Ferrari era","Auto",[P("Red Refractor",5),P("SuperFractor",1)]),
  C("AUTO","Chrome Autograph · first in Ferrari red","Auto",AUTO25)]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Hamilton",meta:"Mega box exclusive",cards:[
  C("4","F1 Drivers · LogoFractor","Base",LOGO25),
  C("SD-2","Speed Demons · LogoFractor","Insert",LOGO25),
  C("HC-2","Helmet Collection · LogoFractor","Insert",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Hamilton",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the Antonelli-verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("4","F1 Drivers · Sapphire","Base",SAPP25),
  C("IS-2","Sapphire insert","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Hamilton",meta:"Ultra high end · on-card auto + race-used memorabilia",
 note:"Codes from recorded sales — expand via + Add.",cards:[
  C("DAF-LHA","Autographed Flag/Suit Nameplate","Auto",[P("Base",2)]),
  C("SDTRA-LH","Triple Relic Autograph","Auto",[P("Gold",1)])]},
{set:"Other Topps — expand via + Add",q:"Topps Hamilton",meta:"Turbo Attax · flagship · Topps Now",cards:[
  C("—","Turbo Attax base + LE variants (2020–2025)","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"charles-leclerc-card-checklist", first:"Charles", last:"Leclerc", full:"Charles Leclerc",
  number:16, team:"Scuderia Ferrari", accent:"#ED1C24", accentD:"#a31218",
  key:"leclerc-index-v1",
  pulse:"RECORD · $264,000 — 2020 Chrome SuperFractor #4 RC 1/1, PSA 9 (Goldin, 2022)",
  prov:"seeded from Topps official checklists and odds sheets (2020, 2024, 2025 verified Jul 2026) plus recorded auction sales. 2020 Chrome #4 is the key Leclerc rookie-era card. 2021–2023 seeded with sale-confirmed grails only; expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10 — update both from one array.",
  topsales:[
{card:'2020 Chrome F1 SuperFractor #4 · 1/1',grade:'PSA 9',price:264000,date:'2022-05-21',source:'Goldin',url:'https://goldin.co/item/2020-topps-chrome-f1-superfractor-4-charles-leclerc-rookie-card-1-1-psb0gfo'},
{card:'2023 Dynasty F1 Auto Suit Nameplate Jumbo Patch #DAFJP-CL · 1/1',grade:'Raw',price:47580,date:'2026-06-06',source:'Goldin',url:'https://goldin.co/item/2023-topps-dynasty-f1-autograph-suit-nameplate-jumbo-patch-dafjp-cl-chntgcq'},
{card:'2020 Chrome Sapphire SP Red Refractor #4 · /5',grade:'PSA 8',price:43920,date:'2024-09-28',source:'Goldin',url:'https://goldin.co/item/2020-topps-chrome-f1-sapphire-edition-sp-red-refractor-4-charles-lecle59rl3'},
{card:'2020 Dynasty F1 Auto Suit Flag Patch #AFP-CL · 1/4',grade:'PSA 9',price:31720,date:'2024-09-28',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-f1-autograph-suit-flag-patch-cl-charles-leclerc-sigvwtny'},
{card:'2022 Dynasty F1 Auto Racing Glove Jumbo Relic · 1/1',grade:'Raw',price:28060,date:'2024-05-04',source:'Goldin',url:'https://goldin.co/item/2022-topps-dynasty-formula-f1-autographed-racing-glove-jumbo-relic-dafvjxs1'},
{card:'2020 Dynasty F1 Triple Relic Auto Gold #TRA-ICL · 1/1',grade:'Raw',price:27450,date:'2025-09-13',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-triple-relic-autograph-tra-icl-charles-leclerc-sign58j21'},
{card:'2020 Dynasty F1 Auto Suit Zipper Relic #AFP-CL · 2/4',grade:'Raw',price:24360,date:'2022-07-16',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-f1-afp-cl-charles-leclerc-rookie-patch-autograph-ca0kak7'},
{card:'2020 Chrome Sapphire SP Red Refractor #4 · /5',grade:'PSA 8',price:22200,date:'2023-01-15',source:'Fanatics'},
{card:'2020 Dynasty F1 Rookie Patch Auto #DAP-IICL · 3/5',grade:'Raw',price:20400,date:'2022-06-04',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-formula-1-dap-iicl-charles-leclerc-signed-rookie-paf1696'}
  ],
  db:[
{set:"2020 Topps Chrome F1",q:"2020 Topps Chrome F1 Leclerc",meta:"Apr 2021 · the inaugural Chrome F1 set · #4 Ferrari",cards:[
  C("4","F1 Drivers · first Topps Chrome","Base",CHROME20),
  C("4 IV","Image Variation SP (seated portrait)","Base",[P("Image Variation SP")]) ]},
{set:"2020 Topps Chrome Sapphire F1",q:"2020 Topps Chrome Sapphire Leclerc",meta:"May 2021 · Topps.com exclusive",cards:[
  C("4","F1 Drivers · Sapphire","Base",SAPP20),
  C("4 IV","Image Variation SP · Sapphire","Base",SAPP20)]},
{set:"2020 Topps Dynasty F1",q:"2020 Topps Dynasty F1 Leclerc",meta:"The first Dynasty F1 · on-card auto + patch",
 note:"Codes and runs from recorded sales (AFP-CL runs /4).",cards:[
  C("DAP-CL I/II","Dynasty Autograph Patch · two variations","Auto",[P("Base",10),P("Red",5),P("Gold",1)]),
  C("AFP-CL","Autographed Suit Flag / Zipper Relic Variations","Auto",[P("Suit Flag",4),P("Suit Zipper",4)]),
  C("TRA-CL I","Triple Relic Autograph","Auto",[P("Gold",1)])]},
{set:"2021–2023 career sets — expand via + Add",q:"Topps F1 Leclerc",meta:"Sale-confirmed grails seeded; full ladders via + Add",cards:[
  C("DAF-CL","2022 Dynasty Racing Glove Jumbo Relic Auto","Auto",[P("Base",1)]),
  C("DAFJP-CL","2023 Dynasty Suit Nameplate Jumbo Patch Auto","Auto",[P("Base",1)]),
  C("—","2021–2023 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Leclerc",meta:"Nov 2024 season",cards:[
  C("3","F1 Drivers · Ferrari","Base",CHROME24)]},
{set:"2024 Topps Chrome LogoFractor F1",q:"2024 Topps Chrome LogoFractor Leclerc",meta:"Same checklist, LogoFractor stock",cards:[
  C("3","F1 Drivers · LogoFractor","Base",LOGO)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Leclerc",meta:"Sapphire treatment of the 2024 checklist",cards:[
  C("3","F1 Drivers · Sapphire","Base",SAPP)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Leclerc",meta:"Jan 2026 · 75th-anniversary flagship",cards:[
  C("3","F1 Drivers · Scuderia Ferrari","Base",CHROME25),
  C("75","F1 Cars · Ferrari","Base",CHROME25),
  C("165","F1 Duo · with Hamilton","Base",CHROME25),
  C("108","Grand Prix Winners","Base",CHROME25),
  C("111","Grand Prix Winners","Base",CHROME25),
  C("118","Pole Position","Base",CHROME25),
  C("125","Grand Prix Driver of the Day","Base",CHROME25),
  C("129","Grand Prix Driver of the Day","Base",CHROME25),
  C("137","Grand Prix Driver of the Day","Base",CHROME25),
  C("140","Grand Prix Driver of the Day","Base",CHROME25),
  C("145","F1 Award Winners","Base",CHROME25),
  C("SCA-2","Ace of Trades","Insert",INSERT25),
  C("LOGO-4","F175 Anniversary Logo","Insert",LOGOF175),
  C("D75-3","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-23","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-LEC","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)]),
  C("Grail No.7–9","The Grail · 2024 top-3 puzzle (prize golds not in packs)","Insert",[P("No.7"),P("No.8"),P("No.9")])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Leclerc",meta:"Mega box exclusive",cards:[
  C("3","F1 Drivers · LogoFractor","Base",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Leclerc",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the Antonelli-verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("3","F1 Drivers · Sapphire","Base",SAPP25),
  C("SS-2","Sapphire Selections","Insert",[P("Base Sapphire")])]},
{set:"Other Topps — expand via + Add",q:"Topps Leclerc",meta:"2025 Dynasty · Turbo Attax · flagship · Topps Now",cards:[
  C("—","2025 Topps Dynasty F1 autos + relics","Auto",[P("Base",10)]),
  C("—","Turbo Attax base + LE variants (2020–2025)","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"oscar-piastri-card-checklist", first:"Oscar", last:"Piastri", full:"Oscar Piastri",
  number:81, team:"McLaren", accent:"#FF8000", accentD:"#b35a00",
  key:"piastri-index-v1",
  pulse:"RECORD · $41,480 — 2023 Dynasty Suit Zipper Jumbo Relic Auto 1/1 (Goldin, Jan 2026)",
  prov:"seeded from Topps official checklists and odds sheets (2025 verified Jul 2026) plus recorded auction sales. 2023 is the rookie year — Dynasty grails seeded from sales; 2024 card numbers are inferred from team-pair checklist order — verify. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2023 Dynasty F1 Auto Suit Zipper Jumbo Relic 1/1',grade:'Raw',price:41480,date:'2026-01-03',source:'Goldin',url:'https://goldin.co/item/2023-topps-dynasty-f1-dynasty-autographed-suit-zipper-jumbo-relic-dafjxxgrw'},
{card:'2025 Dynasty F1 SD Triple Relic Auto Gold 1/1',grade:'Raw',price:33403.6,date:'2026-04-11',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-single-driver-triple-relic-autographs-gold-sdtraiux54'},
{card:'2024 Dynasty F1 Triple Relic Auto Gold #SDTRA-OPI 1/1',grade:'Raw',price:29402,date:'2026-05-09',source:'Goldin',url:'https://goldin.co/item/2024-topps-dynasty-f1-triple-relics-autograph-sdtra-opi-oscar-piastrivrtqu'},
{card:'2023 Dynasty F1 RC Patch Auto Gold 1/1',grade:'Raw',price:25000,date:'2026-06-09',source:'eBay',url:'https://ebay.com/itm/236631872579?nordt=true'},
{card:'2025 Dynasty F1 Auto Patch Gold #DAP-OPIVII 1/1',grade:'Raw',price:19779.86,date:'2026-03-19',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-autographed-patch-gold-dap-opivii-oscar-piastri12g17'},
{card:'2025 Dynasty F1 Flag Suit Nameplate Patch Auto',grade:'Raw',price:15000,date:'2026-02-21',source:'Fanatics',url:'https://www.fanaticscollect.com/weekly/8a428328-06b6-11f1-a941-0264eeceb90f'},
{card:'2025 Chrome F1 Diamond 75th Anniversary Auto 1/1',grade:'Raw',price:14793,date:'2026-06-14',source:'eBay',url:'https://ebay.com/itm/377246744650?nordt=true'},
{card:'2025 Chrome F1 SuperFractor Auto #CAC-PIA 1/1',grade:'PSA 9',price:14500,date:'2026-04-29',source:'eBay',url:'https://ebay.com/itm/298267774179?nordt=true'}
  ],
  db:[
{set:"2023–2024 career sets — expand via + Add",q:"Topps F1 Piastri",meta:"Rookie-year Dynasty grails seeded from sales",cards:[
  C("DAP-OPI","2023 Dynasty Rookie Patch Autograph","Auto",[P("Base",10),P("Gold",1)],1),
  C("ZIPPER","2023 Dynasty Suit Zipper Jumbo Relic Auto","Auto",[P("Base",1)],1),
  C("SDTRA-OPI","2024 Dynasty Triple Relic Autograph","Auto",[P("Gold",1)]),
  C("—","2023 Chrome / Sapphire RC — add via + Add","Base",[P("Base")],1)]},
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Piastri",meta:"Nov 2024 season",
 note:"Card # inferred from team-pair checklist order — verify.",cards:[
  C("8","F1 Drivers · McLaren","Base",CHROME24)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Piastri",meta:"Sapphire treatment",
 note:"Card # inferred from team-pair checklist order — verify.",cards:[
  C("8","F1 Drivers · Sapphire","Base",SAPP)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Piastri",meta:"Jan 2026 · 75th-anniversary flagship",cards:[
  C("6","F1 Drivers · McLaren","Base",CHROME25),
  C("78","F1 Cars · McLaren","Base",CHROME25),
  C("105","Grand Prix Winners","Base",CHROME25),
  C("109","Grand Prix Winners","Base",CHROME25),
  C("134","Grand Prix Driver of the Day","Base",CHROME25),
  C("138","Grand Prix Driver of the Day","Base",CHROME25),
  C("166","F1 Duo · with Norris","Base",CHROME25),
  C("TS-3","Top Speed","Insert",[P("Base",0,"Value"),P("SuperFractor",1)]),
  C("SD-4","Speed Demons","Insert",INSERT25),
  C("D75-6","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-26","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-PIA","Diamond Anniversary Relic","Relic",[P("Diamond Relic",1),P("Diamond Relic Autograph",1)]),
  C("CAC-PIA","Chrome Autograph","Auto",AUTO25)]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Piastri",meta:"Mega box exclusive",cards:[
  C("6","F1 Drivers · LogoFractor","Base",LOGO25),
  C("SD-4","Speed Demons · LogoFractor","Insert",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Piastri",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("6","F1 Drivers · Sapphire","Base",SAPP25),
  C("SS-3","Sapphire Selections","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Piastri",meta:"Ultra high end",
 note:"Codes from recorded sales — at least seven DAP-OPI variations exist.",cards:[
  C("DAP-OPI I–VII","Autograph Patch · seven variations","Auto",[P("Base",10),P("Gold",1)]),
  C("NAMEPLATE","Flag / Suit Nameplate Patch Autograph","Auto",[P("Base",2)])]},
{set:"Other Topps — expand via + Add",q:"Topps Piastri",meta:"Turbo Attax · flagship · Topps Now",cards:[
  C("—","Turbo Attax base + LE variants","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"george-russell-card-checklist", first:"George", last:"Russell", full:"George Russell",
  number:63, team:"Mercedes-AMG Petronas", accent:"#00D2BE", accentD:"#0a8a7c",
  key:"russell-index-v1",
  pulse:"RECORD · $31,720 — 2020 Chrome Auto SuperFractor #F1A-GR 1/1, PSA 7 (Goldin, Nov 2024)",
  prov:"seeded from Topps official checklists and odds sheets (2020, 2025 verified Jul 2026) plus recorded auction sales. 2020 base card number pending — add on confirm; 2024 number inferred from team-pair order. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2020 Chrome F1 Auto SuperFractor #F1A-GR 1/1',grade:'PSA 7',price:31720,date:'2024-11-02',source:'Goldin',url:'https://goldin.co/item/2020-topps-chrome-f1-autograph-superfractor-1-1-gr-george-russell-signb2fn3'},
{card:'2025 Dynasty F1 Auto Patch Gold #DAP-GRUVI 1/1',grade:'Raw',price:29280,date:'2026-03-19',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-autographed-patches-gold-dap-gruvi-george-russeltip7e'},
{card:'2025 Dynasty F1 Constructor Team Dual Relic Auto #CDRA-MER 09/10',grade:'Raw',price:24000,date:'2026-06-07',source:'Fanatics',url:'https://www.fanaticscollect.com/premier/0b54efbc-4a6b-11f1-838d-027004a3c7d9'},
{card:'2020 Dynasty F1 Auto Flag Patch #AFP-GR 2/4',grade:'BGS 9.5',price:21960,date:'2023-12-29',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-f1-autograph-flag-patch-afpgr-george-russell-signedg6uux'},
{card:'2025 Dynasty F1 Team Dual Relic Auto Red /5',grade:'Raw',price:18900,date:'2026-05-21',source:'Fanatics',url:'https://www.fanaticscollect.com/buy-now/22b312eb-7b99-49d7-b1f5-bf9e73d32033'},
{card:'2020 Dynasty F1 RC Patch Auto /10',grade:'PSA 10',price:18499,date:'2026-03-07',source:'eBay',url:'https://ebay.com/itm/116027225085?nordt=true'},
{card:'2025 Dynasty F1 Auto Patch Gold #DAP-GRU 1/1',grade:'Raw',price:17934,date:'2026-04-11',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-autograph-patch-gold-dap-gru-george-russell-signm4bxp'},
{card:'2020 Chrome F1 Sapphire Edition Purple RC',grade:'PSA 10',price:16800,date:'2022-07-17',source:'PWCC',url:'https://www.pwccmarketplace.com/'}
  ],
  db:[
{set:"2020 Topps Chrome F1",q:"2020 Topps Chrome F1 Russell",meta:"Apr 2021 · inaugural Chrome F1 · Williams era",
 note:"Base card number pending — edit on confirm.",cards:[
  C("RC","F1 Drivers · first Topps Chrome","Base",CHROME20),
  C("F1A-GR","Chrome Autograph","Auto",AUTO20)]},
{set:"2020 Topps Chrome Sapphire F1",q:"2020 Topps Chrome Sapphire Russell",meta:"May 2021 · Topps.com exclusive",cards:[
  C("RC","F1 Drivers · Sapphire","Base",SAPP20)]},
{set:"2020 Topps Dynasty F1",q:"2020 Topps Dynasty F1 Russell",meta:"The first Dynasty F1",
 note:"Codes and runs from recorded sales (AFP-GR runs /4).",cards:[
  C("DAP-GR","Dynasty Rookie Patch Autograph","Auto",[P("Base",10),P("Gold",1)]),
  C("AFP-GR","Autographed Flag Patch","Auto",[P("Base",4)])]},
{set:"2021–2023 career sets — expand via + Add",q:"Topps F1 Russell",meta:"Full ladders via + Add",cards:[
  C("—","2021–2023 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Russell",meta:"Nov 2024 season",
 note:"Card # inferred from team-pair checklist order — verify.",cards:[
  C("5","F1 Drivers · Mercedes","Base",CHROME24)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Russell",meta:"Sapphire treatment",
 note:"Card # inferred from team-pair checklist order — verify.",cards:[
  C("5","F1 Drivers · Sapphire","Base",SAPP)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Russell",meta:"Jan 2026 · 75th-anniversary flagship",cards:[
  C("7","F1 Drivers · Mercedes-AMG Petronas","Base",CHROME25),
  C("79","F1 Cars · Mercedes","Base",CHROME25),
  C("103","Grand Prix Winners","Base",CHROME25),
  C("114","Grand Prix Winners","Base",CHROME25),
  C("119","Pole Position","Base",CHROME25),
  C("167","F1 Duo · with Antonelli","Base",CHROME25),
  C("SCA-1","Ace of Trades","Insert",INSERT25),
  C("75-MAMG","1975 Speed Wheels · Mercedes","Insert",[P("Base")]),
  C("D75-7","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-27","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-RUS","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Russell",meta:"Mega box exclusive",cards:[
  C("7","F1 Drivers · LogoFractor","Base",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Russell",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("7","F1 Drivers · Sapphire","Base",SAPP25),
  C("IS-4","Sapphire insert","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Russell",meta:"Ultra high end",
 note:"Codes from recorded sales — at least six DAP-GRU variations exist.",cards:[
  C("DAP-GRU I–VI","Autograph Patch · six variations","Auto",[P("Base",10),P("Gold",1)]),
  C("CDRA-MER","Constructor Team Dual Relic Auto · Mercedes","Auto",[P("Base",10),P("Red",5)])]},
{set:"Other Topps — expand via + Add",q:"Topps Russell",meta:"Turbo Attax · flagship · Topps Now",cards:[
  C("—","Turbo Attax base + LE variants (2019–2025)","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"fernando-alonso-card-checklist", first:"Fernando", last:"Alonso", full:"Fernando Alonso",
  number:14, team:"Aston Martin Aramco", accent:"#229971", accentD:"#166a4f",
  key:"alonso-index-v1",
  pulse:"RECORD · $12,240 — 2021 Dynasty Auto Patch Gold #DAP-FAII 1/1 (Goldin, Aug 2022)",
  prov:"seeded from Topps official checklists and odds sheets (2025 verified Jul 2026) plus recorded auction sales. Includes the pre-Topps 2006 Futera Grand Prix era. 2024 card number inferred from team-pair order — verify. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2021 Dynasty F1 Auto Patch Gold #DAP-FAII 1/1',grade:'Raw',price:12240,date:'2022-08-06',source:'Goldin',url:'https://goldin.co/item/2021-topps-dynasty-f1-dap-faii-fernando-alonso-signed-patch-card-1-1-t82xje'},
{card:'2022 Chrome F1 Auto SuperFractor #CAC-FA 1/1',grade:'PSA 10',price:12000,date:'2023-06-21',source:'Goldin',url:'https://goldin.co/item/2022-topps-chrome-f1-autograph-superfractor-cac-fa-fernando-alonso-sigo0ia1'},
{card:'2025 Topps F1 Liquid Gold Silver 1/1',grade:'Raw',price:5655,date:'2025-11-28',source:'eBay',url:'https://ebay.com/itm/297792437215?nordt=true'},
{card:'2006 Futera Grand Prix Racing Gloves Auto 1/1',grade:'PSA 6',price:3660,date:'2025-09-27',source:'Goldin',url:'https://goldin.co/item/2006-futera-grand-prix-f1-fernando-alonso-signed-card-1-1c0770'},
{card:'2022 Dynasty F1 Flags Patch Auto #DAF-FA 1/2',grade:'Raw',price:3240,date:'2024-03-24',source:'Fanatics'},
{card:'2025 Dynasty F1 Triple Auto Firesuit Relic 1/1',grade:'Raw',price:3175.21,date:'2026-01-01',source:'eBay',url:'https://www.pwccmarketplace.com/items/4317905'},
{card:'2025 Dynasty F1 Patch Auto Gold 1/1',grade:'Raw',price:3050,date:'2025-12-09',source:'eBay',url:'https://ebay.com/itm/127588215133?nordt=true'},
{card:'2025 Chrome F1 Helmet Collection Red #HC-6 · 5/5',grade:'PSA 10',price:3000,date:'2026-04-08',source:'eBay',url:'https://ebay.com/itm/127542995757?nordt=true'}
  ],
  db:[
{set:"2006 Futera Grand Prix — pre-Topps era",q:"2006 Futera Grand Prix Alonso",meta:"Championship-era Futera cards",
 note:"Not a Topps product — included because it anchors the early Alonso market.",cards:[
  C("GLOVE","Racing Gloves Autograph","Auto",[P("Base",1)]),
  C("—","Base cards","Base",[P("Base")])]},
{set:"2021–2023 career sets — expand via + Add",q:"Topps F1 Alonso",meta:"Sale-confirmed grails seeded",cards:[
  C("DAP-FA I/II","2021 Dynasty Autograph Patch · two variations","Auto",[P("Base",10),P("Gold",1)]),
  C("SD-FA","2021 Dynasty Single Driver Dual Relic Auto","Auto",[P("Base",10)]),
  C("CAC-FA","2022 Chrome Autograph","Auto",[P("Base Auto"),P("SuperFractor",1)]),
  C("DAF-FA","2022 Dynasty Flags Patch Autograph","Auto",[P("Base",2)]),
  C("—","2021–2023 Chrome / Sapphire base","Base",[P("Base")])]},
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Alonso",meta:"Nov 2024 season",
 note:"Card # inferred from team-pair checklist order — verify.",cards:[
  C("9","F1 Drivers · Aston Martin","Base",CHROME24)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Alonso",meta:"Sapphire treatment",
 note:"Card # inferred from team-pair checklist order — verify.",cards:[
  C("9","F1 Drivers · Sapphire","Base",SAPP)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Alonso",meta:"Jan 2026 · 75th-anniversary flagship",cards:[
  C("9","F1 Drivers · Aston Martin Aramco","Base",CHROME25),
  C("9 IV","Image Variation SSP (1:2,881 — no parallels)","Base",[P("Image Variation SSP")]),
  C("81","F1 Cars · Aston Martin","Base",CHROME25),
  C("168","F1 Duo · with Stroll","Base",CHROME25),
  C("TS-5","Top Speed","Insert",[P("Base",0,"Value"),P("SuperFractor",1)]),
  C("HC-6","Helmet Collection","Insert",INSERT25),
  C("D75-9","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-29","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-ALO","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Alonso",meta:"Mega box exclusive",cards:[
  C("9","F1 Drivers · LogoFractor","Base",LOGO25),
  C("HC-6","Helmet Collection · LogoFractor","Insert",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Alonso",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("9","F1 Drivers · Sapphire","Base",SAPP25),
  C("IS-5","Sapphire insert","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Alonso",meta:"Ultra high end",
 note:"Codes pending — seeded from recorded sales.",cards:[
  C("TRIPLE","Triple Relic Autograph · firesuit","Auto",[P("Base",1)]),
  C("DAP","Autograph Patch","Auto",[P("Base",10),P("Gold",1)])]},
{set:"Other Topps — expand via + Add",q:"Topps Alonso",meta:"Flagship · Turbo Attax · Topps Now · non-Topps",cards:[
  C("LG","2025 Topps F1 flagship · Liquid Gold","Insert",[P("Silver",1)]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Turbo Attax base + LE variants (2001–2025)","Base",[P("Base")]),
  C("—","2024 PiggyBanx Grand Prix (non-Topps)","Base",[P("Base")])]}
  ]
},
{
  slug:"ayrton-senna-card-checklist", first:"Ayrton", last:"Senna", full:"Ayrton Senna",
  number:1, team:"Legend", accent:"#e6b65c", accentD:"#a8823d",
  key:"senna-index-v1",
  pulse:"RECORD · $46,800 — 1984 Panini Scratch \u2019N Play RC, PSA 7 (Goldin, Oct 2022)",
  prov:"Senna\u2019s market predates Topps F1 — this page tracks his key vintage Panini issues, seeded from recorded auction sales. Vintage value runs on grade rarity rather than serial numbers. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:"1984 Panini F1 Scratch N' Play RC",grade:'PSA 7',price:46800,date:'2022-10-09',source:'Goldin',url:'https://goldin.co/item/1984-panini-f1-grand-prix-scratch-n-play-ayrton-senna-rookie-card-psa4mdzh'},
{card:"1984 Panini F1 Scratch N' Play Panel · Senna / De Angelis",grade:'PSA 7',price:43214.4,date:'2022-06-25',source:'Goldin',url:'https://goldin.co/item/1984-panini-f1-grand-prix-ayrton-senna-and-elio-de-angelis-scratch-n-p2sci6'},
{card:"1984 Panini F1 Scratch N' Play RC",grade:'PSA 7',price:39600,date:'2023-04-25',source:'Goldin',url:'https://goldin.co/item/1984-panini-f1-grand-prix-scratch-n-play-ayrton-senna-rookie-card-psaql364'},
{card:'1986 Panini Supersport Italian #31',grade:'PSA 10',price:34801.2,date:'2022-06-25',source:'Goldin',url:'https://goldin.co/item/1986-panini-supersport-italian-31-ayrton-senna-psa-gem-mt-10di8cx'},
{card:"1984 Panini F1 Scratch N' Play RC",grade:'PSA 9',price:31720,date:'2025-02-22',source:'Goldin',url:'https://goldin.co/item/1984-panini-f1-grand-prix-scratch-n-play-ayrton-senna-rookie-card-psas9gh3'},
{card:"1984 Panini F1 Scratch N' Play RC",grade:'CSG 9',price:31200,date:'2023-07-06',source:'Fanatics'},
{card:"1984 Panini F1 Scratch N' Play RC",grade:'BGS 8',price:28200,date:'2023-08-31',source:'Fanatics'},
{card:"1984 Panini F1 Scratch N' Play RC",grade:'CSG 8.5',price:24600,date:'2023-03-12',source:'Fanatics'},
{card:"1984 Panini F1 Scratch N' Play RC",grade:'BGS 9.5',price:21600,date:'2025-06-26',source:'Fanatics'}
  ],
  db:[
{set:"1984 Panini F1 Grand Prix",q:"1984 Panini F1 Grand Prix Senna",meta:"The Senna rookie · Toleman era",cards:[
  C("RC","Scratch \u2019N Play rookie · Toleman","Base",[P("Base")],1),
  C("PANEL","Scratch \u2019N Play panel · Senna / De Angelis","Base",[P("Base")])]},
{set:"1986 Panini Supersport",q:"1986 Panini Supersport Senna",meta:"Second-year key",cards:[
  C("31","Italian edition","Base",[P("Base")])]},
{set:"1985–1994 issues — expand via + Add",q:"Senna F1 card",meta:"Lotus · McLaren · Williams era issues",cards:[
  C("—","Panini / Quartz / Grid era cards","Base",[P("Base")])]}
  ]
},
{
  slug:"isack-hadjar-card-checklist", first:"Isack", last:"Hadjar", full:"Isack Hadjar",
  number:6, team:"Red Bull", accent:"#3671C6", accentD:"#24518f",
  key:"hadjar-index-v1",
  pulse:"RECORD · $17,940 — 2025 Dynasty Auto Patch Red #DAP-IHA /5 (Goldin, Mar 2026)",
  prov:"seeded from Topps official checklists and odds sheets (2024, 2025 verified Jul 2026) plus recorded auction sales — including his 2024 F2 base #41 and CAC-HAD autograph, both confirmed by Padparadscha sales. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2025 Dynasty F1 Auto Patch Red #DAP-IHA · 5/5',grade:'Raw',price:17940.1,date:'2026-03-19',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-autographed-patches-red-dap-iha-isack-hadjar-sig5vubh'},
{card:'2025 Dynasty F1 Jumbo Relic Auto Constructor Logo #JRA-IHA · 1/1',grade:'Raw',price:12932,date:'2026-03-26',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-jumbo-relic-autographs-constructor-logo-jra-iha1ub1a'},
{card:'2025 Dynasty F1 RC Dual Race-Worn Patch Auto · 1/1',grade:'Raw',price:8100,date:'2025-12-29',source:'eBay',url:'https://ebay.com/itm/157565775411'},
{card:'2024 Chrome Sapphire F1 Auto Padparadscha #CAC-HAD · 1/1',grade:'PSA 10',price:7320,date:'2026-02-07',source:'Goldin',url:'https://goldin.co/item/2024-topps-chrome-sapphire-edition-f1-autographs-padparadscha-cac-hadwvc5n'},
{card:'2024 Chrome Sapphire F1 Padparadscha #41 RC · 1/1',grade:'PSA 10',price:6222,date:'2026-01-03',source:'Goldin',url:'https://goldin.co/item/2024-topps-chrome-sapphire-edition-f1-padparadscha-41-isack-hadjar-rooxsoeg'},
{card:'2025 Dynasty F1 Patch Auto Red RC · 2/5',grade:'Raw',price:6100,date:'2026-01-19',source:'eBay',url:'https://ebay.com/itm/376864334651'},
{card:'2025 Dynasty F1 Single Driver Triple Relic Auto Red #SDTRA-IHAI · 1/5',grade:'Raw',price:5307,date:'2026-03-19',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-single-driver-triple-relic-autographs-red-sdtra5307'}
  ],
  db:[
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Hadjar",meta:"Nov 2024 · F2 runner-up season · first Topps cards",cards:[
  C("41","F2 Drivers · Campos","Base",CHROME24,1),
  C("CAC-HAD","Chrome Autograph","Auto",AUTO24)]},
{set:"2024 Topps Chrome LogoFractor F1",q:"2024 Topps Chrome LogoFractor Hadjar",meta:"Same checklist, LogoFractor stock",cards:[
  C("41","F2 Drivers · LogoFractor","Base",LOGO)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Hadjar",meta:"Padparadscha 1/1s of both cards already sold",cards:[
  C("41","F2 Drivers · Sapphire","Base",SAPP,1),
  C("CAC-HAD","Chrome Autograph · Sapphire","Auto",[P("Base Sapphire"),P("Padparadscha",1)])]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Hadjar",meta:"Jan 2026 · F1 rookie card · #12 Racing Bulls",cards:[
  C("12","F1 Drivers · Racing Bulls","Base",CHROME25,1),
  C("12 IV","Image Variation SSP (1:2,881 — no parallels)","Base",[P("Image Variation SSP")],1),
  C("84","F1 Cars · Racing Bulls","Base",CHROME25),
  C("169","F1 Duo · with Lawson","Base",CHROME25),
  C("SD-5","Speed Demons","Insert",INSERT25),
  C("HC-5","Helmet Collection","Insert",INSERT25),
  C("D75-12","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-32","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-HAD","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Hadjar",meta:"Mega box exclusive",cards:[
  C("12","F1 Drivers · LogoFractor RC","Base",LOGO25,1),
  C("SD-5","Speed Demons · LogoFractor","Insert",LOGO25),
  C("HC-5","Helmet Collection · LogoFractor","Insert",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Hadjar",meta:"Feb 2026 · premium Sapphire RC",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("12","F1 Drivers · Sapphire RC","Base",SAPP25,1),
  C("SS-6","Sapphire Selections","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Hadjar",meta:"Ultra high end",
 note:"Codes from recorded sales — expand via + Add.",cards:[
  C("DAP-IHA","Autograph Patch · variations","Auto",[P("Base",10),P("Red",5),P("Gold",1)],1),
  C("JRA-IHA","Jumbo Relic Auto · Constructor Logo","Auto",[P("Base",1)]),
  C("DUAL-RW","RC Dual Race-Worn Patch Autograph","Auto",[P("Base",1)]),
  C("SDTRA-IHA","Single Driver Triple Relic Auto","Auto",[P("Red",5)])]},
{set:"Other Topps — expand via + Add",q:"Topps Hadjar",meta:"Turbo Attax · flagship · Topps Now",cards:[
  C("—","Turbo Attax base + LE variants","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"liam-lawson-card-checklist", first:"Liam", last:"Lawson", full:"Liam Lawson",
  number:30, team:"Racing Bulls", accent:"#6692FF", accentD:"#4767b3",
  key:"lawson-index-v1",
  pulse:"RECORD · $3,000 — 2022 Chrome Sapphire Padparadscha #81 1/1, PSA 9 (eBay, Jun 2026)",
  prov:"seeded from Topps official checklists and odds sheets (2025 verified Jul 2026) plus recorded auction sales — his first Topps cards are 2022 F2 #81, Padparadscha confirmed by sale. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2022 Chrome Sapphire F1 Padparadscha #81 · 1/1',grade:'PSA 9',price:3000,date:'2026-06-16',source:'eBay',url:'https://ebay.com/itm/305847403492'},
{card:'2025 Dynasty F1 Auto Patch RC · 3/5',grade:'Raw',price:2500,date:'2025-11-23',source:'eBay',url:'https://ebay.com/itm/326873614714'},
{card:'2025 Chrome F1 SuperFractor · 1/1',grade:'Raw',price:2500,date:'2026-05-13',source:'eBay',url:'https://ebay.com/itm/168154028786'},
{card:'2025 Dynasty F1 Auto Patch Red RC · 3/5',grade:'Raw',price:1500.99,date:'2025-11-24',source:'eBay',url:'https://ebay.com/itm/136760275870'},
{card:'2025 Dynasty F1 Triple Gold RC Patch Auto · 1/1',grade:'Raw',price:1380,date:'2026-02-08',source:'Fanatics',url:'https://www.fanaticscollect.com/weekly/db20a7a6-f898-11f0-a391-061378d55a4f'},
{card:'2025 Dynasty F1 Team Dual Relic Auto · Lawson/Hadjar · 3/5',grade:'Raw',price:1275,date:'2025-12-21',source:'eBay',url:'https://ebay.com/itm/376780867974'},
{card:'2025 Dynasty F1 Dual Patch Auto · Lawson/Hadjar · 01/10',grade:'Raw',price:1240.35,date:'2025-12-17',source:'eBay',url:'https://ebay.com/itm/127558910222'},
{card:'2025 Dynasty F1 Constructor Team Dual Relic Auto Red #CDRA-VCARB · 1/5',grade:'Raw',price:1189.5,date:'2026-03-19',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-constructor-team-dual-relic-autograph-red-cdra-vd69zy'}
  ],
  db:[
{set:"2022 Topps Chrome F1",q:"2022 Topps Chrome F1 Lawson",meta:"First Topps cards · F2 Carlin",
 note:"Full 2022 ladder via + Add — base #81 confirmed.",cards:[
  C("81","F2 Drivers · Carlin","Base",[P("Base"),P("Refractor")])]},
{set:"2022 Topps Chrome Sapphire F1",q:"2022 Topps Chrome Sapphire Lawson",meta:"Padparadscha confirmed by sale",cards:[
  C("81","F2 Drivers · Sapphire","Base",[P("Base Sapphire"),P("Padparadscha",1)])]},
{set:"2023–2024 career sets — expand via + Add",q:"Topps F1 Lawson",meta:"AlphaTauri / RB era",cards:[
  C("—","2023–2024 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Lawson",meta:"Jan 2026 · F1 rookie card · #11 Racing Bulls",cards:[
  C("11","F1 Drivers · Racing Bulls","Base",CHROME25,1),
  C("83","F1 Cars · Racing Bulls","Base",CHROME25),
  C("169","F1 Duo · with Hadjar","Base",CHROME25),
  C("TS-6","Top Speed","Insert",[P("Base",0,"Value"),P("SuperFractor",1)]),
  C("SCA-5","Ace of Trades","Insert",INSERT25),
  C("D75-11","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-31","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-LAW","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Lawson",meta:"Mega box exclusive",cards:[
  C("11","F1 Drivers · LogoFractor RC","Base",LOGO25,1)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Lawson",meta:"Feb 2026 · premium Sapphire RC",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("11","F1 Drivers · Sapphire RC","Base",SAPP25,1),
  C("IS-6","Sapphire insert","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Lawson",meta:"Ultra high end",
 note:"Runs from recorded sales — expand via + Add.",cards:[
  C("DAP","Autograph Patch RC · variations","Auto",[P("Base",10),P("Red",5),P("Gold",1)],1),
  C("TRIPLE","Triple Patch Autograph Gold RC","Auto",[P("Gold",1)]),
  C("DUAL-HAD","Dual cards with Hadjar","Auto",[P("Dual Patch Auto",10),P("Team Dual Relic Auto",5)]),
  C("CDRA-VCARB","Constructor Team Dual Relic Auto","Auto",[P("Base",10),P("Red",5)])]},
{set:"Other Topps — expand via + Add",q:"Topps Lawson",meta:"Turbo Attax · flagship · Topps Now",cards:[
  C("—","Turbo Attax base + LE variants","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"carlos-sainz-card-checklist", first:"Carlos", last:"Sainz", full:"Carlos Sainz",
  number:55, team:"Williams", accent:"#00A3E0", accentD:"#00719c",
  key:"sainz-index-v1",
  pulse:"RECORD · $20,000 — 2024 Dynasty Book Gold Patch Auto 1/1 (Fanatics, Oct 2025)",
  prov:"seeded from Topps official checklists and odds sheets (2020, 2025 verified Jul 2026) plus recorded auction sales. 2020 base card number pending; 2024 number inferred from team-pair order (Ferrari 3–4). Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2024 Dynasty F1 Book Gold Patch Auto · 1/1',grade:'CGC Auth',price:20000,date:'2025-10-18',source:'Fanatics',url:'https://www.fanaticscollect.com/buy-now/78d12e9c-c6b6-495c-9191-43071e840c8f'},
{card:'2024 Dynasty F1 Book Gold Patch Auto · 1/1',grade:'CGC Auth',price:14000,date:'2025-11-14',source:'Fanatics',url:'https://www.fanaticscollect.com/fixed/0c549aee-7af4-11f0-84e2-0a58a9feac02'},
{card:'2022 Dynasty F1 Gold Leclerc/Sainz Patch Auto · 1/1',grade:'Raw',price:10500,date:'2023-05-07',source:'Fanatics',url:'https://www.pwccmarketplace.com/items/3780184'},
{card:'2020 Chrome F1 Auto Red Refractor #F1A-CS · /5',grade:'PSA 8',price:8500,date:'2026-04-10',source:'Fanatics',url:'https://www.fanaticscollect.com/buy-now/1cedd100-ed6e-4a04-b73f-91434874bfe5'},
{card:'2021 Dynasty F1 Auto Suit Flag Jumbo Patch #AFJP-CS · 1/1',grade:'SGC',price:7930,date:'2024-12-07',source:'Goldin',url:'https://goldin.co/item/2021-topps-dynasty-f1-autograph-suit-flag-jumbo-patch-afjp-cs-carlos-scsgcj'},
{card:'2024 Dynasty F1 Dual Auto Relic Book Black #DARB-LS · 2/2',grade:'Raw',price:7869,date:'2026-06-06',source:'Goldin',url:'https://goldin.co/item/2024-topps-dynasty-f1-dual-autograph-relic-book-black-darb-ls-charlesnnhuu'},
{card:'2020 Dynasty F1 Gold Jumbo Zipper Patch Auto #AFP-CS · 1/1',grade:'Raw',price:7200,date:'2025-10-21',source:'eBay',url:'https://www.ebay.com/itm/257113256784'}
  ],
  db:[
{set:"2020 Topps Chrome F1",q:"2020 Topps Chrome F1 Sainz",meta:"Apr 2021 · inaugural Chrome F1 · McLaren era",
 note:"Base card number pending — edit on confirm.",cards:[
  C("—","F1 Drivers · first Topps Chrome","Base",CHROME20),
  C("F1A-CS","Chrome Autograph","Auto",AUTO20)]},
{set:"2020 Topps Dynasty F1",q:"2020 Topps Dynasty F1 Sainz",meta:"The first Dynasty F1",cards:[
  C("AFP-CS","Gold Jumbo Zipper Patch Autograph","Auto",[P("Gold",1)])]},
{set:"2021–2023 career sets — expand via + Add",q:"Topps F1 Sainz",meta:"Ferrari era grails seeded from sales",cards:[
  C("AFJP-CS","2021 Dynasty Suit Flag Jumbo Patch Auto","Auto",[P("Base",1)]),
  C("DUO-CL","2022 Dynasty Leclerc/Sainz Patch Auto","Auto",[P("Gold",1)]),
  C("—","2021–2023 Chrome / Sapphire base","Base",[P("Base")])]},
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Sainz",meta:"Nov 2024 · final Ferrari season",
 note:"Card # inferred from team-pair checklist order — verify.",cards:[
  C("4","F1 Drivers · Ferrari","Base",CHROME24)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Sainz",meta:"Sapphire treatment",
 note:"Card # inferred from team-pair checklist order — verify.",cards:[
  C("4","F1 Drivers · Sapphire","Base",SAPP)]},
{set:"2024 Topps Dynasty F1",q:"2024 Topps Dynasty F1 Sainz",meta:"Book cards confirmed by sales",cards:[
  C("BOOK","Book Patch Autograph","Auto",[P("Gold",1)]),
  C("DARB-LS","Dual Auto Relic Book · with Leclerc","Auto",[P("Black",2)])]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Sainz",meta:"Jan 2026 · first Williams cards",cards:[
  C("18","F1 Drivers · Williams","Base",CHROME25),
  C("18 IV","Image Variation SSP (1:2,881 — no parallels)","Base",[P("Image Variation SSP")]),
  C("90","F1 Cars · Williams","Base",CHROME25),
  C("112","Grand Prix Winners","Base",CHROME25),
  C("121","Grand Prix Driver of the Day","Base",CHROME25),
  C("122","Grand Prix Driver of the Day","Base",CHROME25),
  C("124","Grand Prix Driver of the Day","Base",CHROME25),
  C("141","Grand Prix Driver of the Day","Base",CHROME25),
  C("172","F1 Duo · with Albon","Base",CHROME25),
  C("HC-7","Helmet Collection","Insert",INSERT25),
  C("D75-18","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-38","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-SAI","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Sainz",meta:"Mega box exclusive",cards:[
  C("18","F1 Drivers · LogoFractor","Base",LOGO25),
  C("HC-7","Helmet Collection · LogoFractor","Insert",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Sainz",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("18","F1 Drivers · Sapphire","Base",SAPP25),
  C("IS-9","Sapphire insert","Insert",[P("Base Sapphire")])]},
{set:"Other Topps — expand via + Add",q:"Topps Sainz",meta:"Turbo Attax · flagship · Topps Now",cards:[
  C("—","Turbo Attax base + LE variants (2015–2025)","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"gabriel-bortoleto-card-checklist", first:"Gabriel", last:"Bortoleto", full:"Gabriel Bortoleto",
  number:5, team:"Kick Sauber / Audi", accent:"#009A3E", accentD:"#006b2b",
  key:"bortoleto-index-v1",
  pulse:"RECORD · $90,000 — 2025 Topps F1 Rookie Debut Patch Auto 1/1 (Fanatics, Mar 2026)",
  prov:"seeded from Topps official checklists and odds sheets (2025 verified Jul 2026) plus recorded auction sales — his D75A Autograph SuperFractor sale confirms the Diamond Anniversary auto variant. 2024 F2 championship cards via + Add. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2025 Topps F1 Rookie Debut Patch Auto #20 · 1/1',grade:'Raw',price:90000,date:'2026-03-19',source:'Fanatics',url:'https://www.fanaticscollect.com/premier/e701049e-18e6-11f1-8704-067fe7a4a46b'},
{card:'2025 Dynasty F1 Brazil Suit Flag Patch Auto',grade:'Raw',price:13400,date:'2026-01-25',source:'eBay',url:'https://ebay.com/itm/317776897007?nordt=true'},
{card:'2025 Dynasty F1 Rookie Patch Auto Gold · 1/1',grade:'Raw',price:12101,date:'2025-12-14',source:'eBay',url:'https://ebay.com/itm/397376126317?nordt=true'},
{card:'2025 Chrome F1 Diamond 75th Anniversary Auto SuperFractor #D75A-BOR · 1/1',grade:'PSA Auth',price:9760,date:'2026-06-06',source:'Goldin',url:'https://goldin.co/item/2025-topps-chrome-diamond-75th-anniversary-autograph-superfractor-d75avzmvs'},
{card:'2025 Dynasty F1 Rookie Patch Auto · RPA · 1/1',grade:'Raw',price:8101,date:'2026-01-11',source:'eBay',url:'https://ebay.com/itm/317731977752?nordt=true'},
{card:'2025 Dynasty F1 Patch Auto Gold #DAP-GBOII · 1/1',grade:'Raw',price:6405,date:'2026-04-02',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-autographed-patch-gold-dap-gboii-gabriel-bortole538v6'},
{card:'2025 Dynasty F1 Patch Auto Gold #DAP-GBOV · 1/1',grade:'Raw',price:5795,date:'2026-03-14',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-patch-autographs-gold-dap-gbov-gabriel-bortoletoilrdk'}
  ],
  db:[
{set:"2024 F2 championship — expand via + Add",q:"2024 Topps Chrome F1 Bortoleto",meta:"F2 champion · first Topps cards",cards:[
  C("—","2024 Chrome / Sapphire F2 cards — add card #","Base",[P("Base")],1)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Bortoleto",meta:"Jan 2026 · F1 rookie card · #20 Kick Sauber",cards:[
  C("20","F1 Drivers · Kick Sauber","Base",CHROME25,1),
  C("20 IV","Image Variation SSP (1:2,881 — no parallels)","Base",[P("Image Variation SSP")],1),
  C("92","F1 Cars · Kick Sauber","Base",CHROME25),
  C("173","F1 Duo · with Hülkenberg","Base",CHROME25),
  C("SD-10","Speed Demons","Insert",INSERT25),
  C("HC-10","Helmet Collection","Insert",INSERT25),
  C("D75-20","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-40","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-BOR","Diamond Anniversary Relic","Relic",[P("Diamond Relic",1),P("Diamond Relic Autograph SuperFractor",1)])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Bortoleto",meta:"Mega box exclusive",cards:[
  C("20","F1 Drivers · LogoFractor RC","Base",LOGO25,1),
  C("SD-10","Speed Demons · LogoFractor","Insert",LOGO25),
  C("HC-10","Helmet Collection · LogoFractor","Insert",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Bortoleto",meta:"Feb 2026 · premium Sapphire RC",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("20","F1 Drivers · Sapphire RC","Base",SAPP25,1),
  C("SS-1","Sapphire Selections","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Bortoleto",meta:"Ultra high end",
 note:"Runs from recorded sales — expand via + Add.",cards:[
  C("DAP-GBO I–V","Autograph Patch · five variations","Auto",[P("Base",10),P("Red",5),P("Gold",1)],1),
  C("RPA","Rookie Patch Autograph","Auto",[P("Base",1),P("Gold",1)],1),
  C("BRAZIL","Brazil Suit Flag Patch Autograph","Auto",[P("Base",1)])]},
{set:"Other Topps — expand via + Add",q:"Topps Bortoleto",meta:"Flagship RDPA · Turbo Attax · Topps Now",cards:[
  C("RDPA","2025 Topps F1 flagship · Rookie Debut Patch Auto","Auto",[P("Base",1)],1),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Turbo Attax base + LE variants","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"oliver-bearman-card-checklist", first:"Oliver", last:"Bearman", full:"Oliver Bearman",
  number:87, team:"Haas", accent:"#B6BABD", accentD:"#7d8285",
  key:"bearman-index-v1",
  pulse:"RECORD · $20,119 — 2025 Dynasty RC Patch Autograph (eBay, Mar 2026)",
  prov:"seeded from Topps official checklists and odds sheets (2024, 2025 verified Jul 2026) plus recorded auction sales — 2024 F2 base #21 checklist-verified; the HC-8 Red /5 sale confirms the insert ladder. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2025 Dynasty F1 RC Patch Auto RPA',grade:'Raw',price:20119.49,date:'2026-03-08',source:'eBay',url:'https://ebay.com/itm/147176029309'},
{card:'2025 Dynasty F1 Single Patch \u2018O\u2019 RPA RC · 1/5',grade:'Raw',price:8299.99,date:'2026-03-27',source:'eBay',url:'https://ebay.com/itm/336492240240'},
{card:'2025 Dynasty F1 Auto Patch Red #DAP-OBEIV · 3/5',grade:'Raw',price:5795,date:'2026-03-19',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-autographed-patch-red-dap-obeiv-oliver-bearman-s2nffj'},
{card:'2025 Dynasty F1 RC Racing Glove Relic Patch · 2/5',grade:'Raw',price:5400,date:'2025-12-03',source:'eBay',url:'https://ebay.com/itm/397334086471'},
{card:'2025 Dynasty F1 Rookie Triple Patch · 2/2',grade:'Raw',price:5272,date:'2026-03-13',source:'eBay'},
{card:'2025 Dynasty F1 Rookie Patch Auto · 2/5',grade:'Raw',price:5250,date:'2026-03-19',source:'eBay',url:'https://ebay.com/itm/127733683233'},
{card:'2025 Chrome F1 Helmet Collection Red Refractor #HC-8 · 1/5',grade:'PSA 9',price:5201.87,date:'2026-06-07',source:'eBay',url:'https://ebay.com/itm/157963708264'},
{card:'2025 Chrome Sapphire F1 Red Helmet Collection RC · 6/6',grade:'Raw',price:5155,date:'2026-02-25',source:'eBay',url:'https://ebay.com/itm/127695782299'},
{card:'2025 Dynasty F1 RC Triple Race-Worn Patch Auto · 1/2',grade:'Raw',price:5100,date:'2026-01-04',source:'eBay'}
  ],
  db:[
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Bearman",meta:"Nov 2024 · F2 Prema + Ferrari cameo year",cards:[
  C("21","F2 Drivers · Prema","Base",CHROME24,1)]},
{set:"2024 Topps Chrome LogoFractor F1",q:"2024 Topps Chrome LogoFractor Bearman",meta:"Same checklist, LogoFractor stock",cards:[
  C("21","F2 Drivers · LogoFractor","Base",LOGO)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Bearman",meta:"Sapphire treatment",cards:[
  C("21","F2 Drivers · Sapphire","Base",SAPP)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Bearman",meta:"Jan 2026 · F1 rookie card · #14 Haas",cards:[
  C("14","F1 Drivers · Haas","Base",CHROME25,1),
  C("14 IV","Image Variation SSP (1:2,881 — no parallels)","Base",[P("Image Variation SSP")],1),
  C("86","F1 Cars · Haas","Base",CHROME25),
  C("123","Grand Prix Driver of the Day","Base",CHROME25),
  C("170","F1 Duo · with Ocon","Base",CHROME25),
  C("TS-7","Top Speed","Insert",[P("Base",0,"Value"),P("SuperFractor",1)]),
  C("VGS-1","Vegas at Night SP","Insert",SP25),
  C("SD-8","Speed Demons","Insert",INSERT25),
  C("HC-8","Helmet Collection","Insert",INSERT25),
  C("D75-14","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-34","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-BEA","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Bearman",meta:"Mega box exclusive",cards:[
  C("14","F1 Drivers · LogoFractor RC","Base",LOGO25,1),
  C("SD-8","Speed Demons · LogoFractor","Insert",LOGO25),
  C("HC-8","Helmet Collection · LogoFractor","Insert",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Bearman",meta:"Feb 2026 · premium Sapphire RC",
 note:"Ladder mirrors the verified 2025 Sapphire structure — Red HC confirmed by sale.",cards:[
  C("14","F1 Drivers · Sapphire RC","Base",SAPP25,1),
  C("SS-7","Sapphire Selections","Insert",[P("Base Sapphire")]),
  C("HC-8","Helmet Collection · Sapphire","Insert",[P("Base Sapphire"),P("Red",6)])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Bearman",meta:"Ultra high end",
 note:"Runs from recorded sales — expand via + Add.",cards:[
  C("RPA","Rookie Patch Autograph","Auto",[P("Base",1),P("Red",5)],1),
  C("DAP-OBE I–IV","Autograph Patch · four variations","Auto",[P("Base",10),P("Red",5),P("Gold",1)],1),
  C("O-RPA","Single Patch \u2018O\u2019 RPA","Auto",[P("Red",5)]),
  C("GLOVE","RC Racing Glove Relic Patch","Relic",[P("Base",5)]),
  C("TRIPLE","Rookie Triple Patch / Triple Race-Worn Auto","Auto",[P("Triple Patch",2),P("Race-Worn Patch Auto",2)])]},
{set:"Other Topps — expand via + Add",q:"Topps Bearman",meta:"Turbo Attax · flagship · Topps Now",cards:[
  C("—","Turbo Attax base + LE variants","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"arvid-lindblad-card-checklist", first:"Arvid", last:"Lindblad", full:"Arvid Lindblad",
  number:41, team:"Racing Bulls", accent:"#6692FF", accentD:"#4767b3",
  key:"lindblad-index-v1",
  pulse:"RECORD · $1,380 — 2025 Sapphire Auto Black #CAC-LIN /10, PSA 10 (Fanatics, Jun 2026) · 2026 F1 rookie — the RC chase lands in 2026 Chrome",
  prov:"seeded from Topps official checklists and odds sheets (2024, 2025 verified Jul 2026) plus recorded auction sales — 2024 F3 base #45 and 2025 F2 #23 with the CAC-LIN autograph are all sale-confirmed. He debuts in F1 in 2026: his true RC arrives with 2026 Chrome. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2025 Chrome Sapphire F1 Auto Black #CAC-LIN · 01/10',grade:'PSA 10',price:1380,date:'2026-06-14',source:'Fanatics',url:'https://www.fanaticscollect.com/weekly/0d202bb8-6118-11f1-b66b-0a58a9feac02'},
{card:'2024 Chrome Sapphire F1 #45 Red · /5',grade:'PSA 10',price:1025,date:'2025-12-15',source:'eBay',url:'https://ebay.com/itm/187802248223'},
{card:'2025 Chrome F1 Auto Red Refractor · 5/5',grade:'Raw',price:831,date:'2026-03-02',source:'eBay',url:'https://ebay.com/itm/157773873317'},
{card:'2025 Chrome F1 Auto Black Refractor · 03/10',grade:'Raw',price:725,date:'2026-06-01',source:'eBay',url:'https://ebay.com/itm/406954188926'},
{card:'2024 Topps Now F3 Gold #32 · 1/1',grade:'PSA 9',price:719.8,date:'2024-11-29',source:'Goldin',url:'https://goldin.co/item/2024-topps-now-f3-gold-032-arvid-lindblad-1-10uash'},
{card:'2025 Chrome F2 Auto RayWave Black Refractor · /10',grade:'Raw',price:708,date:'2026-03-25',source:'eBay',url:'https://ebay.com/itm/366296579145'},
{card:'2024 Chrome Sapphire F1 #45 Gold · 24/50',grade:'PSA 10',price:700,date:'2026-01-17',source:'eBay',url:'https://ebay.com/itm/267536357617'},
{card:'2024 Chrome LogoFractor F1 #45 Black · 07/10',grade:'Raw',price:700,date:'2026-01-24',source:'eBay',url:'https://ebay.com/itm/397006676231'}
  ],
  db:[
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Lindblad",meta:"Nov 2024 · F3 title fight · first Topps Chrome",cards:[
  C("45","F3 Drivers · Prema","Base",CHROME24,1)]},
{set:"2024 Topps Chrome LogoFractor F1",q:"2024 Topps Chrome LogoFractor Lindblad",meta:"Black /10 sale confirmed",cards:[
  C("45","F3 Drivers · LogoFractor","Base",LOGO)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Lindblad",meta:"Red /5 + Gold /50 sales confirmed",cards:[
  C("45","F3 Drivers · Sapphire","Base",SAPP)]},
{set:"2024 Topps Now F3",q:"2024 Topps Now F3 Lindblad",meta:"Moment card · Gold 1/1 sold at Goldin",cards:[
  C("32","F3 moment card","Base",[P("Base"),P("Gold",1)])]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Lindblad",meta:"Jan 2026 · F2 Campos · CAC-LIN auto confirmed",cards:[
  C("23","F2 Drivers · Campos","Base",CHROME25),
  C("CAC-LIN","Chrome Autograph","Auto",AUTO25)]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Lindblad",meta:"Mega box exclusive",cards:[
  C("23","F2 Drivers · LogoFractor","Base",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Lindblad",meta:"Feb 2026 · premium Sapphire",
 note:"Auto Black /10 and Orange /25 confirmed by sales.",cards:[
  C("23","F2 Drivers · Sapphire","Base",SAPP25),
  C("CAC-LIN","Chrome Autograph · Sapphire","Auto",[P("Base Sapphire"),P("Orange",25),P("Black",10)])]},
{set:"Other Topps — expand via + Add",q:"Topps Lindblad",meta:"2026 Chrome RC incoming · Turbo Attax · Topps Now",cards:[
  C("—","2026 Topps Chrome F1 rookie cards — add on release","Base",[P("Base")],1),
  C("—","Turbo Attax base + LE variants","Base",[P("Base")]),
  C("—","Topps Now F2/F3 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"alex-albon-card-checklist", first:"Alex", last:"Albon", full:"Alex Albon",
  number:23, team:"Williams", accent:"#00A3E0", accentD:"#00719c",
  key:"albon-index-v1",
  pulse:"RECORD · $12,750 — 2020 Dynasty Verstappen/Albon Dual Auto Relic /10 (eBay, Jun 2026)",
  prov:"seeded from Topps official checklists and odds sheets (2020, 2025 verified Jul 2026) plus recorded auction sales — the Ultrasonic SuperFractor sale confirms that 2025 Chrome insert. 2020 base card number pending. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2020 Dynasty F1 Verstappen/Albon Dual Auto Relic · /10',grade:'Raw',price:12750,date:'2026-06-06',source:'eBay',url:'https://ebay.com/itm/318349871825?nordt=true'},
{card:'2020 Dynasty F1 Suit Flag Patch Auto #AA · 1/4',grade:'PSA 8',price:5551,date:'2024-09-28',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-f1-autograph-suit-flag-patch-aa-alex-albon-signed-rsyt0f'},
{card:'2024 Dynasty F1 Jumbo Flag Patch Auto · 1/1',grade:'Raw',price:4200,date:'2026-01-18',source:'eBay',url:'https://ebay.com/itm/358129943375?nordt=true'},
{card:'2025 Chrome F1 Ultrasonic SuperFractor · 1/1',grade:'Raw',price:2500,date:'2026-03-13',source:'eBay',url:'https://ebay.com/itm/168229744320?nordt=true'},
{card:'2024 Dynasty F1 Flag Jumbo Zipper Patch Auto · 1/1',grade:'Raw',price:2037,date:'2025-12-15',source:'eBay',url:'https://ebay.com/itm/187809884532?nordt=true'},
{card:'2025 Chrome F1 SuperFractor · 1/1',grade:'Raw',price:1650,date:'2026-02-07',source:'eBay',url:'https://ebay.com/itm/137018717066?nordt=true'},
{card:'2025 F1 Fanatics Fest Foilfractor · 1/1',grade:'PSA 9',price:1026,date:'2026-04-12',source:'eBay',url:'https://ebay.com/itm/117127895976?nordt=true'},
{card:'2024 Dynasty F1 Relic Book Patch Auto · /5',grade:'Raw',price:1020,date:'2025-10-12',source:'Fanatics',url:'https://www.fanaticscollect.com/weekly/0f1234b0-b91c-11f0-8da5-0a58a9feac02'}
  ],
  db:[
{set:"2020 Topps Chrome F1",q:"2020 Topps Chrome F1 Albon",meta:"Apr 2021 · inaugural Chrome F1 · Red Bull era",
 note:"Base card number pending — edit on confirm.",cards:[
  C("—","F1 Drivers · first Topps Chrome","Base",CHROME20),
  C("— IV","Image Variation SP (seated portrait)","Base",[P("Image Variation SP")])]},
{set:"2020 Topps Dynasty F1",q:"2020 Topps Dynasty F1 Albon",meta:"The first Dynasty F1 (AFP runs /4)",cards:[
  C("AFP-AA","Suit Flag Patch Autograph","Auto",[P("Base",4)]),
  C("DUAL-VER","Verstappen / Albon Dual Auto Relic","Auto",[P("Base",10)])]},
{set:"2021–2023 career sets — expand via + Add",q:"Topps F1 Albon",meta:"Williams return era",cards:[
  C("—","2021–2023 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2024 Topps Dynasty F1",q:"2024 Topps Dynasty F1 Albon",meta:"Jumbo patch autos confirmed by sales",cards:[
  C("JUMBO","Jumbo Flag / Zipper Patch Autographs","Auto",[P("Flag Patch",1),P("Zipper Patch",1)]),
  C("BOOK","Relic Book Patch Autograph","Auto",[P("Base",5)])]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Albon",meta:"Jan 2026 · 75th-anniversary flagship",cards:[
  C("17","F1 Drivers · Williams","Base",CHROME25),
  C("89","F1 Cars · Williams","Base",CHROME25),
  C("172","F1 Duo · with Sainz","Base",CHROME25),
  C("TS-9","Top Speed","Insert",[P("Base",0,"Value"),P("SuperFractor",1)]),
  C("ULTRA","Ultrasonic","Insert",[P("Base"),P("SuperFractor",1)]),
  C("D75-17","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-37","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-ALB","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Albon",meta:"Mega box exclusive",cards:[
  C("17","F1 Drivers · LogoFractor","Base",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Albon",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("17","F1 Drivers · Sapphire","Base",SAPP25),
  C("SS-9","Sapphire Selections","Insert",[P("Base Sapphire")])]},
{set:"Other Topps — expand via + Add",q:"Topps Albon",meta:"Fanatics Fest · Turbo Attax · flagship · Topps Now",cards:[
  C("FF","2025 Fanatics Fest Chrome Foilfractor","Base",[P("Foilfractor",1)]),
  C("—","Turbo Attax base + LE variants","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"valtteri-bottas-card-checklist", first:"Valtteri", last:"Bottas", full:"Valtteri Bottas",
  number:77, team:"Cadillac", accent:"#C0A062", accentD:"#8a7245",
  key:"bottas-index-v1",
  pulse:"RECORD · $20,400 — 2020 Dynasty Constructor Dual Patch Auto Gold #CDAR-HB 1/1, w/ Hamilton (PWCC, Nov 2023)",
  prov:"seeded from Topps official checklists and odds sheets (2020 verified Jul 2026) plus recorded auction sales. 2020 base #2 is inferred from the Mercedes team pair (Hamilton #1 verified) — confirm before relying on it. Cadillac-era cards arrive with the 2026 products. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2020 Dynasty F1 Constructor Dual Patch Auto Gold #CDAR-HB · 1/1',grade:'MBA Auth',price:20400,date:'2023-11-16',source:'PWCC',url:'https://www.pwccmarketplace.com/premier-auction/10852'},
{card:'2020 Dynasty F1 Constructor Dual Patch Auto #CDAR-HB',grade:'BGS 9',price:18000,date:'2022-05-01',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-formula-1-cdarhb-lewis-hamilton-and-valtteri-bottasvdrb6'},
{card:'2021 Dynasty F1 Dual Red Patch Auto · 3/5',grade:'Raw',price:4920,date:'2022-07-03',source:'PWCC',url:'https://www.pwccmarketplace.com/items/3278497'},
{card:'2021 Dynasty F1 Dual Patch Auto #CDAR-LH · 2/10',grade:'Raw',price:3331,date:'2025-08-31',source:'eBay',url:'https://ebay.com/itm/336078215717?nordt=true'},
{card:'2020 Dynasty F1 Patch Auto Gold #DAP-VB · 1/1',grade:'PSA Auth',price:2684,date:'2024-06-29',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-f1-autograph-patch-gold-1-1-vb-valtteri-bottas-sign3kewa'},
{card:'2024 Chrome F1 Circuit Masters Signatures SuperFractor · 1/1',grade:'Raw',price:2000,date:'2025-09-29',source:'eBay',url:'https://ebay.com/itm/297577402396?nordt=true'},
{card:'2020 Dynasty F1 Racing Glove Auto #AFP-VB · 8/10',grade:'Raw',price:1950,date:'2022-06-05',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-formula-1-afp-vb-valtteri-bottas-autograph-glove-rewsr0z'}
  ],
  db:[
{set:"2020 Topps Chrome F1",q:"2020 Topps Chrome F1 Bottas",meta:"Apr 2021 · inaugural Chrome F1 · Mercedes era",
 note:"Card #2 inferred from the Mercedes team pair — verify.",cards:[
  C("2","F1 Drivers · Mercedes","Base",CHROME20),
  C("2 IV","Image Variation SP (seated portrait)","Base",[P("Image Variation SP")])]},
{set:"2020 Topps Chrome Sapphire F1",q:"2020 Topps Chrome Sapphire Bottas",meta:"May 2021 · Topps.com exclusive",
 note:"Card # inferred — verify.",cards:[
  C("2","F1 Drivers · Sapphire","Base",SAPP20)]},
{set:"2020 Topps Dynasty F1",q:"2020 Topps Dynasty F1 Bottas",meta:"The first Dynasty F1",cards:[
  C("DAP-VB","Dynasty Autograph Patch","Auto",[P("Base",10),P("Gold",1)]),
  C("AFP-VB","Autographed Racing Glove Relic","Auto",[P("Base",10)]),
  C("CDAR-HB","Constructor Dual Patch Auto · with Hamilton","Auto",[P("Base",10),P("Gold",1)])]},
{set:"2021–2023 career sets — expand via + Add",q:"Topps F1 Bottas",meta:"Mercedes / Sauber era",cards:[
  C("CDAR-LH","2021 Dynasty Dual Patch Auto · with Hamilton","Auto",[P("Base",10),P("Red",5)]),
  C("—","2021–2023 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Bottas Circuit Masters",meta:"Circuit Masters auto confirmed by SuperFractor sale",cards:[
  C("CMS-VB","Circuit Masters Signatures","Auto",[P("Base Auto"),P("SuperFractor",1)])]},
{set:"Other Topps — expand via + Add",q:"Topps Bottas",meta:"2026 Cadillac cards incoming · Turbo Attax · Topps Now",cards:[
  C("—","2026 Cadillac-era cards — add on release","Base",[P("Base")]),
  C("—","Turbo Attax base + LE variants (2017–2025)","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"daniel-ricciardo-card-checklist", first:"Daniel", last:"Ricciardo", full:"Daniel Ricciardo",
  number:3, team:"Legend", accent:"#e6b65c", accentD:"#a8823d",
  key:"ricciardo-index-v1",
  pulse:"RECORD · $5,100 — 2020 Dynasty Glove Jumbo Patch Auto #AFP-DR 1/1 (Goldin, Jul 2022)",
  prov:"seeded from Topps official checklists and odds sheets (2020 verified Jul 2026) plus recorded auction sales — the Track Tags Gold /50 sale confirms that 2020 insert. Retired 2024; his 2025 Chrome appearance is the Driver of the Day card #139. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2020 Dynasty F1 Auto Racing Glove Jumbo Patch #AFP-DR · 1/1',grade:'Raw',price:5100,date:'2022-07-16',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-f1-afp-dr-daniel-ricciardo-rookie-jumbo-glove-patch2sheg'},
{card:'2020 Dynasty F1 Constructor Team Auto · Ricciardo/Ocon · 4/10',grade:'Raw',price:3720,date:'2022-05-01',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-formula-1-dynasty-constructor-team-autograph-memorabxv3l'},
{card:'2020 Chrome F1 Auto Red Refractor #F1A-DR',grade:'PSA 7',price:3300,date:'2022-07-16',source:'Goldin',url:'https://goldin.co/item/2020-topps-chrome-f1a-dr-daniel-ricciardo-f1-autograph-red-refractor-cle9vf'},
{card:'2020 Chrome F1 Track Tags Gold #7 · 31/50',grade:'PSA 10',price:2500,date:'2025-09-30',source:'eBay',url:'https://ebay.com/itm/397107527579'},
{card:'2020 Dynasty F1 Constructor Team Dual Relic Auto Red · 1/5',grade:'PSA 10',price:2400,date:'2022-09-10',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-f1-constructor-team-dual-relic-autograph-cdar-ro-da1cc2e'},
{card:'2020 Dynasty F1 Single Driver Triple Relic Auto Red #TRA-IDR · 1/5',grade:'PSA 10',price:2220,date:'2022-06-05',source:'Goldin',url:'https://goldin.co/item/2020-topps-f1-dynasty-tra-idr-daniel-ricciardo-triple-relic-autograph45qy9'}
  ],
  db:[
{set:"2020 Topps Chrome F1",q:"2020 Topps Chrome F1 Ricciardo",meta:"Apr 2021 · inaugural Chrome F1 · Renault era",
 note:"Base card number pending — edit on confirm.",cards:[
  C("—","F1 Drivers · first Topps Chrome","Base",CHROME20),
  C("F1A-DR","Chrome Autograph","Auto",AUTO20),
  C("TT-7","Track Tags","Insert",[P("Base"),P("Gold",50)])]},
{set:"2020 Topps Dynasty F1",q:"2020 Topps Dynasty F1 Ricciardo",meta:"The first Dynasty F1",cards:[
  C("DAP-DR I/II","Dynasty Autograph Patch · two variations","Auto",[P("Base",10),P("Gold",1)]),
  C("AFP-DR","Racing Glove Jumbo Patch Autograph","Auto",[P("Base",1)]),
  C("TRA-DR I","Single Driver Triple Relic Auto","Auto",[P("Red",5)]),
  C("CDAR-RO","Constructor Team Auto · with Ocon","Auto",[P("Base",10),P("Red",5)])]},
{set:"2021–2024 career sets — expand via + Add",q:"Topps F1 Ricciardo",meta:"McLaren Monza win · RB farewell",cards:[
  C("—","2021–2024 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Ricciardo",meta:"Jan 2026 · farewell appearance",cards:[
  C("139","Grand Prix Driver of the Day","Base",CHROME25)]},
{set:"Other Topps — expand via + Add",q:"Topps Ricciardo",meta:"Turbo Attax · flagship · Topps Now",cards:[
  C("—","Turbo Attax base + LE variants (2012–2024)","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"esteban-ocon-card-checklist", first:"Esteban", last:"Ocon", full:"Esteban Ocon",
  number:31, team:"Haas", accent:"#B6BABD", accentD:"#7d8285",
  key:"ocon-index-v1",
  pulse:"RECORD · $2,800 — 2020 Dynasty Patch Auto Red #DAP-IEC /5 (eBay, May 2026)",
  prov:"seeded from Topps official checklists and odds sheets (2020, 2025 verified Jul 2026) plus recorded auction sales — including the 2025 Eccellenza dual booklet with Bearman. 2020 base card number pending. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2020 Dynasty F1 Patch Auto Red #DAP-IEC · 5/5',grade:'Raw',price:2800,date:'2026-05-05',source:'eBay',url:'https://ebay.com/itm/377151688652?nordt=true'},
{card:'2020 Dynasty F1 Patch Auto #DAP-IEC · /10',grade:'PSA 10',price:2500,date:'2024-07-14',source:'PWCC',url:'https://www.pwccmarketplace.com/vault-marketplace/630702'},
{card:'2025 Dynasty F1 Patch Auto Gold · 1/1',grade:'Raw',price:1895,date:'2025-12-19',source:'eBay',url:'https://ebay.com/itm/397392482868?nordt=true'},
{card:'2021 Chrome F1 SuperFractor Auto #CA-EO · 1/1',grade:'PSA 9',price:1800,date:'2022-11-19',source:'Goldin',url:'https://goldin.co/item/2021-topps-chrome-f1-autograph-superfractor-ca-eo-esteban-ocon-signed1tpzf'},
{card:'2020 Dynasty F1 Auto Memorabilia #DAP-IEC · /10',grade:'Raw',price:1440,date:'2022-05-01',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-formula-1-dynasty-autograph-memorabilia-dap-iec-estr0ops'},
{card:'2025 Eccellenza F1 Dual Auto Booklet · Bearman/Ocon · /5',grade:'Raw',price:1400,date:'2026-03-23',source:'eBay',url:'https://ebay.com/itm/157771967693?nordt=true'}
  ],
  db:[
{set:"2020 Topps Chrome F1",q:"2020 Topps Chrome F1 Ocon",meta:"Apr 2021 · inaugural Chrome F1 · Renault era",
 note:"Base card number pending — edit on confirm.",cards:[
  C("—","F1 Drivers · first Topps Chrome","Base",CHROME20),
  C("— IV","Image Variation SP (seated portrait)","Base",[P("Image Variation SP")])]},
{set:"2020 Topps Dynasty F1",q:"2020 Topps Dynasty F1 Ocon",meta:"The first Dynasty F1",cards:[
  C("DAP-EC I/II","Dynasty Autograph Patch · variations","Auto",[P("Base",10),P("Red",5)]),
  C("CDAR-RO","Constructor Team Auto · with Ricciardo","Auto",[P("Base",10),P("Red",5)])]},
{set:"2021–2024 career sets — expand via + Add",q:"Topps F1 Ocon",meta:"Alpine era · Hungary win",cards:[
  C("CA-EO","2021 Chrome Autograph","Auto",[P("Base Auto"),P("SuperFractor",1)]),
  C("—","2021–2024 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Ocon",meta:"Jan 2026 · 75th-anniversary flagship",cards:[
  C("13","F1 Drivers · Haas","Base",CHROME25),
  C("85","F1 Cars · Haas","Base",CHROME25),
  C("170","F1 Duo · with Bearman","Base",CHROME25),
  C("D75-13","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-33","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-OCO","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Ocon",meta:"Mega box exclusive",cards:[
  C("13","F1 Drivers · LogoFractor","Base",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Ocon",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("13","F1 Drivers · Sapphire","Base",SAPP25),
  C("IS-7","Sapphire insert","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Ocon",meta:"Ultra high end",cards:[
  C("DAP","Autograph Patch","Auto",[P("Base",10),P("Gold",1)]),
  C("ZIPPER","Suit Zipper Jumbo Patch Autograph","Auto",[P("Base",1)])]},
{set:"2025 Topps Eccellenza F1",q:"2025 Topps Eccellenza Ocon",meta:"Dual booklet confirmed by sale",cards:[
  C("DUAL-BEA","Dual Auto Booklet · with Bearman","Auto",[P("Base",5)])]},
{set:"Other Topps — expand via + Add",q:"Topps Ocon",meta:"Turbo Attax · flagship · Topps Now",cards:[
  C("—","Turbo Attax base + LE variants","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"franco-colapinto-card-checklist", first:"Franco", last:"Colapinto", full:"Franco Colapinto",
  number:43, team:"Alpine", accent:"#0093CC", accentD:"#00648c",
  key:"colapinto-index-v1",
  pulse:"RECORD · $2,257 — 2024 Chrome SuperFractor Auto #CAC-COL 1/1, PSA 9 (Goldin, Jan 2026)",
  prov:"seeded from Topps official checklists and odds sheets (2024, 2025 verified Jul 2026) plus recorded auction sales — the Lights Out Gold Framed Auto sale confirms that product. 2024 base card number pending. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2024 Chrome F1 SuperFractor Auto #CAC-COL · 1/1',grade:'PSA 9',price:2257,date:'2026-01-03',source:'Goldin',url:'https://goldin.co/item/2024-topps-chrome-f1-chrome-autographs-superfractor-cac-col-franco-coliqbhn'},
{card:'2025 Dynasty F1 Race-Used Relic Auto · 1/2',grade:'Raw',price:1825,date:'2025-12-06',source:'eBay',url:'https://ebay.com/itm/205877332970?nordt=true'},
{card:'2025 Dynasty F1 Single Driver Triple Relic Auto Gold · 1/1',grade:'Raw',price:1825,date:'2025-12-07',source:'eBay',url:'https://ebay.com/itm/389313046054?nordt=true'},
{card:'2025 Lights Out F1 Gold Framed Auto · 1/1',grade:'PSA 8',price:1670,date:'2026-03-30',source:'eBay',url:'https://ebay.com/itm/157784776772?nordt=true'},
{card:'2025 Dynasty F1 Race-Worn Rookie Patch Auto · 1/1',grade:'Raw',price:1575,date:'2025-12-21',source:'eBay',url:'https://ebay.com/itm/157547680872?nordt=true'},
{card:'2025 Dynasty F1 Single Driver Triple Relic Auto Gold · BWT · 1/1',grade:'Raw',price:1524,date:'2026-02-20',source:'eBay',url:'https://ebay.com/itm/157801559694?nordt=true'}
  ],
  db:[
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Colapinto",meta:"Nov 2024 · Williams debut year · CAC-COL confirmed",
 note:"Base card number pending — edit on confirm.",cards:[
  C("—","F2 Drivers — add card #","Base",CHROME24,1),
  C("CAC-COL","Chrome Autograph","Auto",AUTO24)]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Colapinto",meta:"Jan 2026 · #15 Alpine",cards:[
  C("15","F1 Drivers · Alpine","Base",CHROME25),
  C("15 IV","Image Variation SSP (1:2,881 — no parallels)","Base",[P("Image Variation SSP")]),
  C("87","F1 Cars · Alpine","Base",CHROME25),
  C("171","F1 Duo · with Gasly","Base",CHROME25),
  C("SD-9","Speed Demons","Insert",INSERT25),
  C("HC-9","Helmet Collection","Insert",INSERT25),
  C("D75-15","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-35","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-COL","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Colapinto",meta:"Mega box exclusive",cards:[
  C("15","F1 Drivers · LogoFractor","Base",LOGO25),
  C("SD-9","Speed Demons · LogoFractor","Insert",LOGO25),
  C("HC-9","Helmet Collection · LogoFractor","Insert",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Colapinto",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("15","F1 Drivers · Sapphire","Base",SAPP25),
  C("SS-8","Sapphire Selections","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Colapinto",meta:"Ultra high end",cards:[
  C("RPA","Race-Worn Rookie Patch Autograph","Auto",[P("Base",1)]),
  C("RELIC","Race-Used Relic Autograph","Auto",[P("Base",2)]),
  C("SDTRA","Single Driver Triple Relic Auto · variations","Auto",[P("Gold",1),P("Gold · BWT",1)])]},
{set:"2025 Topps Lights Out F1",q:"2025 Topps Lights Out Colapinto",meta:"Framed autos confirmed by sale",cards:[
  C("AUTO","Gold Framed Autograph","Auto",[P("Gold",1)])]},
{set:"Other Topps — expand via + Add",q:"Topps Colapinto",meta:"Turbo Attax · flagship · Topps Now",cards:[
  C("—","Turbo Attax base + LE variants","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"lance-stroll-card-checklist", first:"Lance", last:"Stroll", full:"Lance Stroll",
  number:18, team:"Aston Martin Aramco", accent:"#229971", accentD:"#166a4f",
  key:"stroll-index-v1",
  pulse:"RECORD · $3,600 — 2020 Chrome Auto SuperFractor #F1A-LS 1/1, PSA 8 (Goldin, Sep 2022)",
  prov:"seeded from Topps official checklists and odds sheets (2020, 2025 verified Jul 2026) plus recorded auction sales — the World on Wheels SuperFractor sale confirms that 2020 insert. 2020 base card number pending. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2020 Chrome F1 Autographs SuperFractor #F1A-LS · 1/1',grade:'PSA 8',price:3600,date:'2022-09-24',source:'Goldin',url:'https://goldin.co/item/2020-topps-chrome-f1-superfractor-f1a-ls-lance-stroll-signed-card-1-10wer9'},
{card:'2020 Dynasty F1 Suit Zipper Relic Patch Auto #AFP-LS · 4/4',grade:'Raw',price:2550,date:'2026-05-05',source:'eBay',url:'https://ebay.com/itm/377149304976?nordt=true'},
{card:'2020 Chrome F1 World On Wheels SuperFractor · 1/1',grade:'PSA 10',price:2520,date:'2023-10-22',source:'PWCC',url:'https://www.pwccmarketplace.com/items/4076083'},
{card:'2025 Dynasty F1 Flag Patch Suit Nameplate Auto · 2/2',grade:'Raw',price:1325,date:'2026-03-18',source:'eBay',url:'https://ebay.com/itm/377032247019?nordt=true'},
{card:'2020 Dynasty F1 Red Patch Auto #DAP-IILS · 3/5',grade:'PSA 10',price:1320,date:'2026-05-26',source:'Fanatics',url:'https://www.fanaticscollect.com/weekly/2d9c5af8-4f0f-11f1-b677-0a58a9feac02'},
{card:'2020 Dynasty F1 Red Patch Auto · 3/5',grade:'Raw',price:1247,date:'2026-05-19',source:'eBay',url:'https://ebay.com/itm/127864955011?nordt=true'}
  ],
  db:[
{set:"2020 Topps Chrome F1",q:"2020 Topps Chrome F1 Stroll",meta:"Apr 2021 · inaugural Chrome F1 · Racing Point era",
 note:"Base card number pending — edit on confirm.",cards:[
  C("—","F1 Drivers · first Topps Chrome","Base",CHROME20),
  C("F1A-LS","Chrome Autograph","Auto",AUTO20),
  C("WOW","1954 World on Wheels","Insert",[P("Base"),P("SuperFractor",1)])]},
{set:"2020 Topps Dynasty F1",q:"2020 Topps Dynasty F1 Stroll",meta:"The first Dynasty F1 (AFP runs /4)",cards:[
  C("DAP-LS I/II","Dynasty Autograph Patch · variations","Auto",[P("Base",10),P("Red",5)]),
  C("AFP-LS","Suit Zipper Relic Patch Autograph","Auto",[P("Base",4)])]},
{set:"2021–2024 career sets — expand via + Add",q:"Topps F1 Stroll",meta:"Aston Martin era",cards:[
  C("—","2021–2024 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Stroll",meta:"Jan 2026 · 75th-anniversary flagship",cards:[
  C("10","F1 Drivers · Aston Martin Aramco","Base",CHROME25),
  C("82","F1 Cars · Aston Martin","Base",CHROME25),
  C("168","F1 Duo · with Alonso","Base",CHROME25),
  C("SD-6","Speed Demons","Insert",INSERT25),
  C("D75-10","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-30","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-STR","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Stroll",meta:"Mega box exclusive",cards:[
  C("10","F1 Drivers · LogoFractor","Base",LOGO25),
  C("SD-6","Speed Demons · LogoFractor","Insert",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Stroll",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("10","F1 Drivers · Sapphire","Base",SAPP25),
  C("SS-5","Sapphire Selections","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Stroll",meta:"Ultra high end",cards:[
  C("NAMEPLATE","Flag Patch Suit Nameplate Autograph","Auto",[P("Base",2)])]},
{set:"Other Topps — expand via + Add",q:"Topps Stroll",meta:"Turbo Attax · flagship · Topps Now",cards:[
  C("—","Turbo Attax base + LE variants (2017–2025)","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"sergio-perez-card-checklist", first:"Sergio", last:"Perez", full:"Sergio P\u00e9rez",
  number:11, team:"Cadillac", accent:"#C0A062", accentD:"#8a7245",
  key:"perez-index-v1",
  pulse:"RECORD · $17,080 — 2022 Dynasty Constructor Dual Relic Auto Gold #CTDRA-MV 1/1, w/ Verstappen (Goldin, Feb 2026)",
  prov:"seeded from Topps official checklists and odds sheets (2024 verified Jul 2026) plus recorded auction sales — including the 2024 Eccellenza Reliquia La Squadra booklet. Cadillac-era cards arrive with the 2026 products. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2022 Dynasty F1 Constructor Dual Relic Auto Gold #CTDRA-MV · 1/1',grade:'PSA 8',price:17080,date:'2026-02-07',source:'Goldin',url:'https://goldin.co/item/2022-topps-dynasty-f1-constructor-s-dual-relic-autograph-gold-ctdra-mvwnvu3'},
{card:'2023 Dynasty F1 Constructor Dual Relic Auto Gold #CTDRA-RB · /4',grade:'Raw',price:13908,date:'2026-06-06',source:'Goldin',url:'https://goldin.co/item/2023-topps-dynasty-f1-constructor-team-dual-relic-autograph-ctdra-rbrfoeuc'},
{card:'2024 Eccellenza F1 Reliquia La Squadra Booklet · 1/1',grade:'Raw',price:9455,date:'2026-01-01',source:'Goldin',url:'https://goldin.co/item/2024-topps-eccellenza-formula-1-reliquia-la-squadra-booklet-sergio-perzp7oz'},
{card:'2022 Dynasty F1 Suit Flag Patch Auto #DAF-SP · 2/2',grade:'Raw',price:8400,date:'2026-05-31',source:'Fanatics',url:'https://www.fanaticscollect.com/weekly/a60b9c4a-52f9-11f1-ac7b-0a58a9feac02'},
{card:'2023 Dynasty F1 Racing Glove Jumbo Patch Auto #DAFJP-SP · 1/1',grade:'PSA 9',price:6893,date:'2025-03-29',source:'Goldin',url:'https://goldin.co/item/2023-topps-dynasty-f1-autograph-relic-jumbo-patch-dafjpsp-sergio-perez7l5ey'}
  ],
  db:[
{set:"2020–2023 career sets — expand via + Add",q:"Topps F1 Perez",meta:"Racing Point win · Red Bull era grails from sales",cards:[
  C("CTDRA-MV","2022 Dynasty Constructor Dual Relic Auto · with Verstappen","Auto",[P("Base",10),P("Gold",1)]),
  C("CTDRA-RB","2023 Dynasty Constructor Dual Relic Auto · Red Bull","Auto",[P("Base",4)]),
  C("DAF-SP","2022 Dynasty Suit Flag Patch Autograph","Auto",[P("Base",2)]),
  C("DAFJP-SP","2023 Dynasty Racing Glove Jumbo Patch Auto","Auto",[P("Base",1)]),
  C("—","2020–2023 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Perez",meta:"Nov 2024 · final Red Bull season · card #2",cards:[
  C("2","F1 Drivers · Red Bull","Base",CHROME24)]},
{set:"2024 Topps Chrome LogoFractor F1",q:"2024 Topps Chrome LogoFractor Perez",meta:"Same checklist, LogoFractor stock",cards:[
  C("2","F1 Drivers · LogoFractor","Base",LOGO)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Perez",meta:"Sapphire treatment",cards:[
  C("2","F1 Drivers · Sapphire","Base",SAPP)]},
{set:"2024 Topps Eccellenza F1",q:"2024 Topps Eccellenza Perez",meta:"Booklet confirmed by sale",cards:[
  C("SQUADRA","Reliquia La Squadra Booklet","Relic",[P("Base",1)])]},
{set:"Other Topps — expand via + Add",q:"Topps Perez",meta:"2026 Cadillac cards incoming · Turbo Attax · Topps Now",cards:[
  C("—","2026 Cadillac-era cards — add on release","Base",[P("Base")]),
  C("—","Turbo Attax base + LE variants (2011–2024)","Base",[P("Base")]),
  C("—","Topps Now F1 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"nikola-tsolov-card-checklist", first:"Nikola", last:"Tsolov", full:"Nikola Tsolov",
  number:"NT", team:"F3 Prospect", accent:"#8A99A8", accentD:"#5c6773",
  key:"tsolov-index-v1",
  pulse:"Market forming — no recorded sales tracked yet",
  prov:"prospect page. 2025 Chrome F3 base #52 is checklist-verified; earlier junior-series cards via <b>+ Add</b>. Sales board fills in as the market forms.",
  topsales:[],
  db:[
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Tsolov",meta:"Jan 2026 · F3 Drivers",cards:[
  C("52","F3 Drivers","Base",CHROME25)]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Tsolov",meta:"Mega box exclusive",cards:[
  C("52","F3 Drivers · LogoFractor","Base",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Tsolov",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("52","F3 Drivers · Sapphire","Base",SAPP25)]},
{set:"Other Topps — expand via + Add",q:"Topps Tsolov",meta:"Junior-series cards · Topps Now F3",cards:[
  C("—","2023–2024 F3 Chrome cards — add card #","Base",[P("Base")]),
  C("—","Topps Now F3 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"nico-hulkenberg-card-checklist", first:"Nico", last:"H\u00fclkenberg", full:"Nico H\u00fclkenberg",
  number:27, team:"Kick Sauber / Audi", accent:"#009A3E", accentD:"#006b2b",
  key:"hulkenberg-index-v1",
  pulse:"RECORD · $2,000 — 2025 Dynasty H\u00fclkenberg/Bortoleto Dual Relic Auto 1/1 (eBay, Mar 2026)",
  prov:"seeded from Topps official checklists and odds sheets (2025 verified Jul 2026) plus recorded auction sales — the Auto Red /5 sale confirms his 2025 Chrome CAC autograph. First podium (Silverstone 2025) belongs in Topps Now. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2025 Dynasty F1 H\u00fclkenberg/Bortoleto Dual Relic Auto · 1/1',grade:'Raw',price:2000,date:'2026-03-13',source:'eBay',url:'https://ebay.com/itm/157517938428?nordt=true'},
{card:'2024 Dynasty F1 Vertical Jumbo Zipper Patch Auto · 1/1',grade:'Raw',price:1525,date:'2026-03-08',source:'eBay',url:'https://ebay.com/itm/389674241963?nordt=true'},
{card:'2025 Dynasty F1 Patch Auto Gold #DAP-NH · 1/1',grade:'Raw',price:1035,date:'2026-03-01',source:'eBay',url:'https://ebay.com/itm/317875041934?nordt=true'},
{card:'2024 Dynasty F1 Suit Zipper Auto Gold · 1/1',grade:'Raw',price:1001,date:'2026-04-12',source:'eBay',url:'https://ebay.com/itm/318096771706?nordt=true'},
{card:'2024 Dynasty F1 Triple Relic Auto · 1/1',grade:'Raw',price:1000,date:'2025-08-18',source:'eBay',url:'https://ebay.com/itm/336055615250?nordt=true'},
{card:'2025 Chrome F1 Auto Red · 5/5',grade:'Raw',price:900,date:'2026-04-01',source:'eBay',url:'https://ebay.com/itm/168182696623?nordt=true'}
  ],
  db:[
{set:"2020–2024 career sets — expand via + Add",q:"Topps F1 Hulkenberg",meta:"Super-sub · Haas era grails from sales",cards:[
  C("ZIPPER","2024 Dynasty Vertical Jumbo Zipper / Suit Zipper Gold Autos","Auto",[P("Vertical Jumbo",1),P("Suit Zipper Gold",1)]),
  C("TRIPLE","2024 Dynasty Triple Relic Auto","Auto",[P("Base",1)]),
  C("—","2020–2024 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Hulkenberg",meta:"Jan 2026 · first-podium season · #19 Kick Sauber",cards:[
  C("19","F1 Drivers · Kick Sauber","Base",CHROME25),
  C("91","F1 Cars · Kick Sauber","Base",CHROME25),
  C("173","F1 Duo · with Bortoleto","Base",CHROME25),
  C("TS-10","Top Speed","Insert",[P("Base",0,"Value"),P("SuperFractor",1)]),
  C("CAC-NH","Chrome Autograph","Auto",AUTO25),
  C("D75-19","Mini Diamond · 75th Anniversary pack","Insert",MINID),
  C("D75-39","Mini Diamond II · 75th Anniversary pack","Insert",MINID),
  C("D75A-HUL","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)])]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Hulkenberg",meta:"Mega box exclusive",cards:[
  C("19","F1 Drivers · LogoFractor","Base",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Hulkenberg",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("19","F1 Drivers · Sapphire","Base",SAPP25),
  C("IS-10","Sapphire insert","Insert",[P("Base Sapphire")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Hulkenberg",meta:"Ultra high end",cards:[
  C("DAP-NH","Autograph Patch","Auto",[P("Base",10),P("Gold",1)]),
  C("DUAL-BOR","Dual Relic Auto · with Bortoleto","Auto",[P("Base",1)]),
  C("TRIPLE","Triple Patch Autograph","Auto",[P("Base",1)])]},
{set:"2025 Topps Now F1",q:"Topps Now F1 Hulkenberg",meta:"Moment cards — add #s as issued",cards:[
  C("TN","FIRST PODIUM · P3 Silverstone · 239-race wait ends","Base",[P("Base")])]},
{set:"Other Topps — expand via + Add",q:"Topps Hulkenberg",meta:"Turbo Attax · flagship",cards:[
  C("—","Turbo Attax base + LE variants (2010–2025)","Base",[P("Base")]),
  C("—","2025 Topps Formula 1 flagship base + parallels","Base",[P("Base")])]}
  ]
},
{
  slug:"ugo-ugochukwu-card-checklist", first:"Ugo", last:"Ugochukwu", full:"Ugo Ugochukwu",
  number:45, team:"Prema F3 · McLaren junior", accent:"#FF8000", accentD:"#b35a00",
  key:"ugochukwu-index-v1",
  pulse:"RECORD · $550 — 2025 Chrome first Auto Black /10 (eBay, Jun 2026) · market forming",
  prov:"prospect page. 2025 Chrome F3 base #45 is checklist-verified and his first Topps autograph is sale-confirmed. Earlier junior-series cards via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage board.",
  topsales:[
{card:'2025 Chrome F1 F3 First Auto Black Refractor · /10',grade:'Raw',price:550,date:'2026-06-13',source:'eBay'}
  ],
  db:[
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Ugochukwu",meta:"Jan 2026 · F3 Prema · first Topps auto confirmed",cards:[
  C("45","F3 Drivers · Prema","Base",CHROME25),
  C("AUTO","Chrome Autograph · first Topps auto","Auto",AUTO25)]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Ugochukwu",meta:"Mega box exclusive",cards:[
  C("45","F3 Drivers · LogoFractor","Base",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Ugochukwu",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("45","F3 Drivers · Sapphire","Base",SAPP25)]},
{set:"Other Topps — expand via + Add",q:"Topps Ugochukwu",meta:"Junior-series cards · Topps Now F3",cards:[
  C("—","Earlier junior-series cards — add via + Add","Base",[P("Base")]),
  C("—","Topps Now F3 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"rafael-camara-card-checklist", first:"Rafael", last:"C\u00e2mara", full:"Rafael C\u00e2mara",
  number:47, team:"Invicta F2", accent:"#0066CC", accentD:"#004a94",
  key:"camara-index-v1",
  pulse:"RECORD · $870 — 2025 Sapphire first Auto Orange /25 (eBay, Apr 2026) · 2025 F3 champion",
  prov:"prospect page. 2025 Chrome F3 base #47 is checklist-verified — his championship season — and the Sapphire Orange /25 autograph is sale-confirmed. F2 cards arrive with the 2026 products. Top Values mirrors the F1 Card Index homepage board.",
  topsales:[
{card:'2025 Chrome F1 First Auto Orange Sapphire · /25',grade:'Raw',price:870,date:'2026-04-01',source:'eBay'}
  ],
  db:[
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Camara",meta:"Jan 2026 · F3 champion season",cards:[
  C("47","F3 Drivers · champion season","Base",CHROME25),
  C("AUTO","Chrome Autograph","Auto",AUTO25)]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Camara",meta:"Mega box exclusive",cards:[
  C("47","F3 Drivers · LogoFractor","Base",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Camara",meta:"Feb 2026 · premium Sapphire · Orange /25 auto sold",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("47","F3 Drivers · Sapphire","Base",SAPP25),
  C("AUTO","Chrome Autograph · Sapphire","Auto",[P("Base Sapphire"),P("Orange",25)])]},
{set:"Other Topps — expand via + Add",q:"Topps Camara",meta:"2026 F2 cards incoming · Topps Now F3",cards:[
  C("—","2026 F2 Chrome cards — add on release","Base",[P("Base")]),
  C("—","Topps Now F3 title moments","Base",[P("Base")])]}
  ]
},
{
  slug:"michael-schumacher-card-checklist", first:"Michael", last:"Schumacher", full:"Michael Schumacher",
  number:1, team:"Legend", accent:"#e6b65c", accentD:"#a8823d",
  key:"schumacher-index-v1",
  pulse:"RECORD · $6,000 — 1992 Amada Fighting Spirit #17 RC, PSA 9 (Goldin, Apr 2023)",
  prov:"legend page spanning both eras: the 1992 rookie market (Amada, Grid), the Futera memorabilia years, and modern Topps — his 2024 Chrome F1 Legends card #192 is sale-verified through the SuperFractor and Rose Gold 1/1s. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'1992 Amada F1 Fighting Spirit #17 RC',grade:'PSA 9',price:6000,date:'2023-04-05',source:'Goldin',url:'https://goldin.co/item/1992-amada-formula-fighting-spirit-17-michael-schumacher-rookie-card-pcgqj2'},
{card:'2006 Futera GP Material Proof Patch #DM08 · /275',grade:'SGC 9',price:5040,date:'2022-07-24',source:'Fanatics'},
{card:'1992 Grid Formula One RC #51',grade:'PSA 10',price:5000,date:'2025-10-21',source:'Fanatics'},
{card:'2005 Futera GP Special Memorabilia #SDM11',grade:'PSA 9',price:4880,date:'2026-03-12',source:'Goldin',url:'https://goldin.co/item/2005-futera-grand-prix-special-memorabilia-sdm11-michael-schumacher-pavlbp'},
{card:'2024 Chrome F1 SuperFractor #192 · 1/1',grade:'PSA 10',price:4270,date:'2025-03-29',source:'Goldin',url:'https://goldin.co/item/2024-topps-chrome-f1-superfractor-192-michael-schumacher-1-1lxisf'},
{card:'2024 Chrome LogoFractor F1 Rose Gold #192 · 1/1',grade:'PSA 9',price:4000,date:'2026-03-29',source:'eBay'},
{card:'2005 Futera GP Special Memorabilia #SDM11',grade:'PSA 8',price:3900,date:'2022-11-26',source:'Goldin',url:'https://goldin.co/item/2005-futera-grand-prix-special-memorabilia-sdm11-michael-schumacher-room0g0'},
{card:'2024 Eccellenza Reliquia Race-Worn Relic · 1/5',grade:'Raw',price:3000,date:'2025-08-15',source:'eBay'}
  ],
  db:[
{set:"1992 rookie era",q:"1992 Michael Schumacher rookie card",meta:"Benetton-era rookies · the vintage keys",cards:[
  C("17","1992 Amada F1 Fighting Spirit RC","Base",[P("Base")],1),
  C("51","1992 Grid Formula One RC","Base",[P("Base")],1)]},
{set:"2005–2006 Futera Grand Prix",q:"Futera Grand Prix Schumacher",meta:"Ferrari-era memorabilia cards",cards:[
  C("SDM11","2005 Special Memorabilia relic","Relic",[P("Base")]),
  C("DM08","2006 Material Proof Patch","Relic",[P("Base",275)])]},
{set:"2024 Topps Chrome F1",q:"2024 Topps Chrome F1 Schumacher 192",meta:"F1 Legends · card #192 · SuperFractor 1/1 sold",cards:[
  C("192","F1 Legends","Base",CHROME24)]},
{set:"2024 Topps Chrome LogoFractor F1",q:"2024 Topps Chrome LogoFractor Schumacher",meta:"Rose Gold 1/1 sold",cards:[
  C("192","F1 Legends · LogoFractor","Base",LOGO)]},
{set:"2024 Topps Chrome Sapphire F1",q:"2024 Topps Chrome Sapphire Schumacher",meta:"Sapphire treatment of the legends checklist",cards:[
  C("192","F1 Legends · Sapphire","Base",SAPP)]},
{set:"2024 premium relics",q:"2024 Topps Schumacher relic",meta:"Eccellenza + Finest, sale-confirmed",cards:[
  C("RELIQUIA","2024 Eccellenza Reliquia Race-Worn Relic","Relic",[P("Base",5)]),
  C("RACEDAY","2024 Finest F1 Raceday Relics","Relic",[P("Base"),P("SuperFractor",1)])]},
{set:"2025 Topps Chrome F1 — expand via + Add",q:"2025 Topps Chrome F1 Schumacher Legends",meta:"F1 Legends section (149+)",cards:[
  C("—","F1 Legends — add card # on confirm","Base",[P("Base")])]},
{set:"Other — expand via + Add",q:"Schumacher F1 card",meta:"1991–2012 issues · Panini · Turbo Attax",cards:[
  C("—","1991–2012 era cards","Base",[P("Base")])]}
  ]
},
{
  slug:"kimi-raikkonen-card-checklist", first:"Kimi", last:"R\u00e4ikk\u00f6nen", full:"Kimi R\u00e4ikk\u00f6nen",
  number:7, team:"Legend", accent:"#e6b65c", accentD:"#a8823d",
  key:"raikkonen-index-v1",
  pulse:"RECORD · $10,800 — 2020 Chrome Auto SuperFractor #F1A-KR 1/1 (Goldin, Aug 2022)",
  prov:"legend page seeded from Topps official checklists and odds sheets (2020, 2025 verified Jul 2026) plus recorded auction sales — including the 2025 Dynasty Legendary Patch Auto line (LPA-KRAI Gold 1/1 sold). 2020 base card number pending. Expand via <b>+ Add</b>. Top Values mirrors the F1 Card Index homepage Top 10.",
  topsales:[
{card:'2020 Chrome F1 Auto SuperFractor #F1A-KR · 1/1',grade:'PSA Auth',price:10800,date:'2022-08-06',source:'Goldin',url:'https://goldin.co/item/2020-topps-chrome-f1a-kr-kimi-raikkonen-f1-autograph-gold-refractor-ca8yf9y'},
{card:'2021 Chrome F1 Auto SuperFractor #CA-KR · 1/1',grade:'PSA 9',price:6240,date:'2022-07-16',source:'Goldin',url:'https://goldin.co/item/2021-topps-chrome-formula-1-ca-kr-kimi-raikkonen-signed-card-1-1r5gub'},
{card:'2020 Dynasty F1 Auto Suit Nameplate #AFP-KR · 4/4',grade:'Raw',price:5700,date:'2022-07-16',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-f1-afp-kr-kimi-raikkonen-rookie-patch-autograph-4-4rrjld'},
{card:'2020 Dynasty F1 Auto Patch Gold #DAP-KR · 1/1',grade:'Raw',price:5490,date:'2024-09-02',source:'Goldin',url:'https://goldin.co/item/2020-topps-dynasty-f1-autographed-patch-gold-dap-kr-kimi-raikkonen-sigqdn0s'},
{card:'2025 Dynasty F1 Legendary Patch Auto Gold #LPA-KRAI · 1/1',grade:'Raw',price:3794.2,date:'2026-04-02',source:'Goldin',url:'https://goldin.co/item/2025-topps-dynasty-f1-legendary-patch-autographs-gold-lpa-krai-kimi-rauif5s'},
{card:'2020 Dynasty F1 Suit Zipper Relic Auto · 4/4',grade:'Raw',price:3400,date:'2026-05-03',source:'eBay'}
  ],
  db:[
{set:"2020 Topps Chrome F1",q:"2020 Topps Chrome F1 Raikkonen",meta:"Apr 2021 · inaugural Chrome F1 · Alfa Romeo era",
 note:"Base card number pending — edit on confirm.",cards:[
  C("—","F1 Drivers · first Topps Chrome","Base",CHROME20),
  C("F1A-KR","Chrome Autograph","Auto",AUTO20)]},
{set:"2020 Topps Dynasty F1",q:"2020 Topps Dynasty F1 Raikkonen",meta:"The first Dynasty F1 (AFP runs /4)",cards:[
  C("DAP-KR","Dynasty Autograph Patch","Auto",[P("Base",10),P("Gold",1)]),
  C("AFP-KR","Suit Nameplate Patch Autograph","Auto",[P("Base",4)]),
  C("ZIPPER","Suit Zipper Relic Autograph","Auto",[P("Base",4)])]},
{set:"2021–2024 career sets — expand via + Add",q:"Topps F1 Raikkonen",meta:"Farewell-era grails from sales",cards:[
  C("CA-KR","2021 Chrome Autograph","Auto",[P("Base Auto"),P("SuperFractor",1)]),
  C("—","2021–2024 Chrome / Sapphire / Dynasty","Base",[P("Base")])]},
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Raikkonen",meta:"Jan 2026 · legends inserts",cards:[
  C("SD-11","Speed Demons","Insert",INSERT25),
  C("D75A-RAI","Diamond Anniversary Relic · genuine embedded diamond","Relic",[P("Diamond Relic",1)]),
  C("—","F1 Legends base — add card # on confirm","Base",[P("Base")])]},
{set:"2025 Topps Dynasty F1",q:"2025 Topps Dynasty F1 Raikkonen",meta:"Legendary Patch Autographs confirmed by sale",cards:[
  C("LPA-KRAI","Legendary Patch Autograph","Auto",[P("Base",10),P("Gold",1)])]},
{set:"Other — expand via + Add",q:"Raikkonen F1 card",meta:"2001–2021 era issues",cards:[
  C("—","Pre-Topps and Turbo Attax era cards","Base",[P("Base")])]}
  ]
},
{
  slug:"leonardo-fornaroli-card-checklist", first:"Leonardo", last:"Fornaroli", full:"Leonardo Fornaroli",
  number:"LF", team:"F2 Champion", accent:"#C0A062", accentD:"#8a7245",
  key:"fornaroli-index-v1",
  pulse:"RECORD · $541 — 2025 Chrome SuperFractor 1/1 (eBay, May 2026) · 2025 F2 champion",
  prov:"prospect page. 2025 Chrome F2 base #21 is checklist-verified — his championship season — with the SuperFractor 1/1 already sold. F1-era cards arrive with the 2026 products. Top Values mirrors the F1 Card Index homepage board.",
  topsales:[
{card:'2025 Chrome F1 SuperFractor · 1/1',grade:'Raw',price:541,date:'2026-05-01',source:'eBay'}
  ],
  db:[
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Fornaroli",meta:"Jan 2026 · F2 champion season · #21",cards:[
  C("21","F2 Drivers · champion season","Base",CHROME25)]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Fornaroli",meta:"Mega box exclusive",cards:[
  C("21","F2 Drivers · LogoFractor","Base",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Fornaroli",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("21","F2 Drivers · Sapphire","Base",SAPP25)]},
{set:"Other Topps — expand via + Add",q:"Topps Fornaroli",meta:"2026 F1 rookie cards incoming · Topps Now F2",cards:[
  C("—","2026 rookie-era cards — add on release","Base",[P("Base")],1),
  C("—","Topps Now F2 title moments","Base",[P("Base")])]}
  ]
},
{
  slug:"jak-crawford-card-checklist", first:"Jak", last:"Crawford", full:"Jak Crawford",
  number:"JC", team:"F2", accent:"#229971", accentD:"#166a4f",
  key:"crawford-index-v1",
  pulse:"RECORD · $1,100 — 2025 Sapphire Padparadscha Auto 1/1 (eBay, May 2026)",
  prov:"prospect page. 2025 Chrome F2 base #31 is checklist-verified and the Sapphire Padparadscha autograph sale confirms his Chrome auto. Top Values mirrors the F1 Card Index homepage board.",
  topsales:[
{card:'2025 Chrome Sapphire Padparadscha Auto · 1/1',grade:'Raw',price:1100,date:'2026-05-01',source:'eBay'}
  ],
  db:[
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Crawford",meta:"Jan 2026 · F2 Drivers · auto confirmed",cards:[
  C("31","F2 Drivers","Base",CHROME25),
  C("AUTO","Chrome Autograph","Auto",AUTO25)]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Crawford",meta:"Mega box exclusive",cards:[
  C("31","F2 Drivers · LogoFractor","Base",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Crawford",meta:"Feb 2026 · Padparadscha auto sold",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("31","F2 Drivers · Sapphire","Base",SAPP25),
  C("AUTO","Chrome Autograph · Sapphire","Auto",[P("Base Sapphire"),P("Padparadscha",1)])]},
{set:"Other Topps — expand via + Add",q:"Topps Crawford",meta:"Junior-series cards · Topps Now F2",cards:[
  C("—","Earlier junior-series cards","Base",[P("Base")]),
  C("—","Topps Now F2 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"luke-browning-card-checklist", first:"Luke", last:"Browning", full:"Luke Browning",
  number:"LB", team:"F2", accent:"#64C4FF", accentD:"#3e85b3",
  key:"browning-index-v1",
  pulse:"Market forming — no recorded sales tracked yet",
  prov:"prospect page. 2025 Chrome F2 base #28 is checklist-verified; earlier junior-series cards via <b>+ Add</b>. Sales board fills in as the market forms.",
  topsales:[],
  db:[
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Browning",meta:"Jan 2026 · F2 Drivers",cards:[
  C("28","F2 Drivers","Base",CHROME25)]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Browning",meta:"Mega box exclusive",cards:[
  C("28","F2 Drivers · LogoFractor","Base",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Browning",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("28","F2 Drivers · Sapphire","Base",SAPP25)]},
{set:"Other Topps — expand via + Add",q:"Topps Browning",meta:"Junior-series cards · Topps Now F2",cards:[
  C("—","Earlier junior-series cards","Base",[P("Base")]),
  C("—","Topps Now F2 moment cards","Base",[P("Base")])]}
  ]
},
{
  slug:"joshua-durksen-card-checklist", first:"Joshua", last:"D\u00fcrksen", full:"Joshua D\u00fcrksen",
  number:"JD", team:"Invicta F2", accent:"#b06cf0", accentD:"#7a49a8",
  key:"durksen-index-v1",
  pulse:"Market forming — no recorded sales tracked yet",
  prov:"prospect page. 2025 Chrome F2 base #37 is checklist-verified; earlier junior-series cards via <b>+ Add</b>. Sales board fills in as the market forms.",
  topsales:[],
  db:[
{set:"2025 Topps Chrome F1",q:"2025 Topps Chrome F1 Durksen",meta:"Jan 2026 · F2 Drivers",cards:[
  C("37","F2 Drivers · Invicta","Base",CHROME25)]},
{set:"2025 Topps Chrome LogoFractor F1",q:"2025 Topps Chrome LogoFractor Durksen",meta:"Mega box exclusive",cards:[
  C("37","F2 Drivers · LogoFractor","Base",LOGO25)]},
{set:"2025 Topps Chrome Sapphire F1",q:"2025 Topps Chrome Sapphire Durksen",meta:"Feb 2026 · premium Sapphire",
 note:"Ladder mirrors the verified 2025 Sapphire structure — verify vs odds sheet.",cards:[
  C("37","F2 Drivers · Sapphire","Base",SAPP25)]},
{set:"Other Topps — expand via + Add",q:"Topps Durksen",meta:"Junior-series cards · Topps Now F2",cards:[
  C("—","Earlier junior-series cards","Base",[P("Base")]),
  C("—","Topps Now F2 moment cards","Base",[P("Base")])]}
  ]
}
];

/* ---------------- emit ---------------- */
const tpl=fs.readFileSync(path.join(__dirname,'checklist-template.html'),'utf8');
const esc=s=>String(s);
for(const d of DRIVERS){
  let out=tpl;
  const title=`${d.full} Card Checklist & Collection Tracker — Every Topps Parallel | F1 Card Index`;
  const rep={
    '{{TITLE}}':title,
    '{{TITLE_SHORT}}':`${d.full} Card Checklist & Collection Tracker`,
    '{{DESC}}':`Every ${d.last} Topps F1 card in one checklist: all parallels, inserts, autographs and relics — with a collection tracker and record sales.`,
    '{{OGDESC}}':`Every ${d.last} Topps parallel, insert, auto and relic — trackable.`,
    '{{SLUG}}':d.slug,
    '{{NUMBER}}':String(d.number),
    '{{LASTUP}}':d.last.toUpperCase(),
    '{{SUB}}':`${d.full} · ${d.team} · the F1 Card Index collection tracker`,
    '{{ACCENT}}':d.accent,'{{ACCENT_D}}':d.accentD,
    '{{FIRST}}':d.first,
    '{{PULSE}}':d.pulse,
    '{{PROV}}':d.prov,
    '{{KEY}}':d.key,
    '{{TOPSALES}}':JSON.stringify(d.topsales),
    '{{DB}}':JSON.stringify(d.db),
    '{{PAGES}}':JSON.stringify(DRIVERS.map(x=>({key:x.key,slug:x.slug,name:x.last})))
  };
  for(const[k,v]of Object.entries(rep))out=out.split(k).join(esc(v));
  const dest=path.join(__dirname,'..',d.slug+'.html');
  fs.writeFileSync(dest,out);
  const n=d.db.reduce((a,s)=>a+s.cards.reduce((b,c)=>b+c.pars.length,0),0);
  console.log(`wrote ${d.slug}.html — ${n} variations`);
}
